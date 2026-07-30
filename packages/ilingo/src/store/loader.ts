/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { getPathValue, setPathValue } from 'pathtrace';
import { normalizeNamespaceBody } from '../catalog/normalize';
import type { Leaf, NamespaceBodyInput, Translations } from '../types';
import { isPluralNode } from '../utils/identify';
import type {
    IInvalidatingStore,
    IMutableStore,
    ISyncStore,
    InvalidateListener,
    StoreGetContext,
    StoreSetContext,
} from './types';
import { SYNC_UNAVAILABLE } from './types';

/**
 * User-supplied loader. Resolves a `(locale, namespace)` pair to a
 * `TranslationsNode` (`defineTranslations({ ... })`) — the namespace body whose
 * `(locale, namespace)` is fixed by the call arguments.
 *
 * Return `undefined` to signal "no data for this pair" — the store caches
 * the absence so the loader isn't called again for the same pair.
 */
export type LoaderFn = (
    locale: string,
    namespace: string,
) => Promise<NamespaceBodyInput | undefined> | NamespaceBodyInput | undefined;

export type LoaderStoreOptions = {
    /**
     * Function that loads a `Translations` on demand for a given
     * `(locale, namespace)` pair. Typically wraps a dynamic `import()`:
     *
     * ```typescript
     * new LoaderStore({
     *     // each module's default export is a translations node — a `.json` file
     *     // shaped `{ "type": "translations", "data": { ... } }`, or a `.ts` file
     *     // `export default defineTranslations({ ... })`.
     *     loader: (locale, namespace) =>
     *         import(`./locales/${locale}/${namespace}.json`).then((m) => m.default),
     * });
     * ```
     */
    loader: LoaderFn,
    /**
     * Optional list of locales the loader knows about. Returned verbatim
     * from `getLocales()` so `Ilingo.getLocales()` can answer without
     * touching the loader (which would otherwise mean probing every
     * (locale, namespace) combination). If omitted, `getLocales()` returns
     * whatever has been cached so far.
     */
    locales?: string[],

    id?: string | symbol,
};

type CacheEntry = {
    /** `undefined` when the loader explicitly returned no data — cached as a miss. */
    record: Translations | undefined,
};

/**
 * Separator used to join `(locale, namespace)` into a cache key. The NUL byte
 * is forbidden in both BCP-47 tags and any sensible filename/namespace name,
 * so the resulting key is unambiguous even when a namespace string contains
 * characters that would collide with a printable separator.
 */
const KEY_SEP = '\u0000';

/**
 * Lazy-loaded store backed by a user-supplied `loader(locale, namespace)`.
 * Caches the loaded `Translations` per `(locale, namespace)` so the loader is
 * called at most once per pair until `invalidate()` is called.
 *
 * Designed for SPA / browser code-splitting:
 *
 * ```typescript
 * const store = new LoaderStore({
 *     loader: (locale, namespace) => import(`./locales/${locale}/${namespace}.json`)
 *         .then((m) => m.default),
 *     locales: ['en', 'de'],
 * });
 * ```
 *
 * Implements `IInvalidatingStore` — calling `invalidate(locale?, namespace?)`
 * drops the matching cached entries and fires the `invalidate` event so
 * subscribers (e.g. a Vue composable in dev mode) can re-fetch.
 */
export class LoaderStore implements IInvalidatingStore, IMutableStore, ISyncStore {
    readonly id: string | symbol;

    protected loaderFn: LoaderFn;

    protected locales: string[];

    /** Map of `${locale}\0${namespace} (NUL-joined)` → cache entry (including miss markers). */
    protected cache = new Map<string, CacheEntry>();

    /** In-flight loads, keyed identically, so concurrent get()s share a promise. */
    protected inflight = new Map<string, Promise<Translations | undefined>>();

    protected listeners = new Set<InvalidateListener>();

    /**
     * Monotonically increasing generation counter. Bumped by `invalidate()`.
     * `loadNamespace` captures the generation at the start of a load and only
     * writes the resolved value into the cache if the generation hasn't
     * changed in the meantime — protects against an in-flight load
     * clobbering a fresh cache state after an invalidation race.
     */
    protected generation = 0;

    constructor(options: LoaderStoreOptions) {
        this.loaderFn = options.loader;
        this.id = options.id || Symbol('LoaderStore');
        this.locales = options.locales ? [...options.locales] : [];
    }

    async get(context: StoreGetContext): Promise<Leaf | undefined> {
        const record = await this.loadNamespace(context.locale, context.namespace);
        return this.readKey(record, context.key);
    }

    /**
     * {@link ISyncStore} read — answers only from the cache. A pair that has
     * not been loaded yet resolves to `SYNC_UNAVAILABLE` (the loader is *not*
     * kicked off; that is `get`'s job). A pair cached as a miss is a definite
     * miss, matching `get`.
     */
    getSync(context: StoreGetContext): Leaf | undefined | typeof SYNC_UNAVAILABLE {
        const cached = this.cache.get(this.cacheKey(context.locale, context.namespace));
        if (!cached) return SYNC_UNAVAILABLE;

        return this.readKey(cached.record, context.key);
    }

    protected readKey(record: Translations | undefined, key: string): Leaf | undefined {
        if (!record) return undefined;

        const output = getPathValue(record, key);
        if (typeof output === 'string') return output;
        if (isPluralNode(output)) return output.data;
        return undefined;
    }

    async set(context: StoreSetContext): Promise<void> {
        // Set mutates the cached record for the (locale, namespace). If the
        // namespace hasn't been loaded yet, load it first so we don't overwrite
        // the loader's data on a subsequent get().
        const record = (await this.loadNamespace(context.locale, context.namespace)) ?? {};
        setPathValue(record, context.key, context.value);
        this.cache.set(this.cacheKey(context.locale, context.namespace), { record });
        // Notify subscribers — `IInvalidatingStore` consumers (Vue's
        // useTranslation, custom watchers) treat any mutation as a reason
        // to refetch. Keeps the contract of the interface internally
        // consistent: changes are observable.
        this.emit(context.locale, context.namespace);
    }

    async getLocales(): Promise<string[]> {
        if (this.locales.length > 0) {
            return [...this.locales];
        }
        // No declared locale list — return the set of locales we've seen
        // loads for. Best-effort; consumers that want a complete list
        // should pass `locales` to the constructor.
        const seen = new Set<string>();
        for (const key of this.cache.keys()) {
            const sep = key.indexOf(KEY_SEP);
            if (sep >= 0) seen.add(key.slice(0, sep));
        }
        return Array.from(seen);
    }

    invalidate(locale?: string, namespace?: string): void {
        // Bump the generation so in-flight loads can detect they were
        // invalidated mid-flight and skip writing their (now stale) result
        // into the cache.
        this.generation += 1;

        if (typeof locale === 'undefined') {
            this.cache.clear();
        } else if (typeof namespace === 'undefined') {
            const prefix = `${locale}${KEY_SEP}`;
            for (const key of this.cache.keys()) {
                if (key.startsWith(prefix)) this.cache.delete(key);
            }
        } else {
            this.cache.delete(this.cacheKey(locale, namespace));
        }
        // Fire after cache is dropped so subscribers see the post-invalidate
        // state if they probe the store.
        this.emit(locale, namespace);
    }

    on(event: 'invalidate', listener: InvalidateListener): () => void {
        // Event name reserved for future expansion (only 'invalidate' today).
        if (event !== 'invalidate') {
            return () => {};
        }
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    }

    protected cacheKey(locale: string, namespace: string): string {
        return `${locale}${KEY_SEP}${namespace}`;
    }

    protected emit(locale: string | undefined, namespace: string | undefined): void {
        for (const listener of this.listeners) {
            listener(locale, namespace);
        }
    }

    protected async loadNamespace(locale: string, namespace: string): Promise<Translations | undefined> {
        const key = this.cacheKey(locale, namespace);
        const cached = this.cache.get(key);
        if (cached) return cached.record;

        // De-duplicate concurrent loads — multiple `get()` calls for the
        // same (locale, namespace) share one loader invocation.
        const existing = this.inflight.get(key);
        if (existing) return existing;

        // Capture the generation at load start. If invalidate() bumps it
        // before we resolve, our result is stale by definition — drop it on
        // the floor so the next get() re-runs the loader against the
        // post-invalidate state.
        const startGeneration = this.generation;

        const promise = Promise.resolve(this.loaderFn(locale, namespace))
            .then((body) => {
                this.inflight.delete(key);
                // Reduce the loaded namespace body to the internal `Translations`
                // shape before caching — every store holds the normalized
                // form. A nullish body is cached as a miss.
                const record = typeof body === 'undefined' ?
                    undefined :
                    normalizeNamespaceBody(body);
                if (this.generation === startGeneration) {
                    this.cache.set(key, { record });
                }
                return record;
            })
            .catch((err) => {
                // Don't poison the cache with a failed load; the next get()
                // will try again. Propagate so the orchestrator's existing
                // missing-key path can handle it.
                this.inflight.delete(key);
                throw err;
            });
        this.inflight.set(key, promise);
        return promise;
    }
}
