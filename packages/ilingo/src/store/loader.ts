/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { getPathValue, setPathValue } from 'pathtrace';
import type { Leaf, LinesRecord } from '../types';
import { asPluralLeaf } from '../utils/identify';
import type {
    InvalidateListener,
    InvalidatingStore,
    StoreGetContext,
    StoreSetContext,
} from './types';

/**
 * User-supplied loader. Resolves a `(locale, group)` pair to a `LinesRecord`
 * (the same nested-object shape every other store uses internally).
 *
 * Return `undefined` to signal "no data for this pair" — the store caches
 * the absence so the loader isn't called again for the same pair.
 */
export type LoaderFn = (
    locale: string,
    group: string,
) => Promise<LinesRecord | undefined> | LinesRecord | undefined;

export type LoaderStoreOptions = {
    /**
     * Function that loads a `LinesRecord` on demand for a given
     * `(locale, group)` pair. Typically wraps a dynamic `import()`:
     *
     * ```typescript
     * new LoaderStore({
     *     loader: async (locale, group) => {
     *         const m = await import(`./locales/${locale}/${group}.json`);
     *         return m.default;
     *     },
     * });
     * ```
     */
    loader: LoaderFn,
    /**
     * Optional list of locales the loader knows about. Returned verbatim
     * from `getLocales()` so `Ilingo.getLocales()` can answer without
     * touching the loader (which would otherwise mean probing every
     * (locale, group) combination). If omitted, `getLocales()` returns
     * whatever has been cached so far.
     */
    locales?: string[],
};

type CacheEntry = {
    /** `undefined` when the loader explicitly returned no data — cached as a miss. */
    record: LinesRecord | undefined,
};

/**
 * Lazy-loaded store backed by a user-supplied `loader(locale, group)`.
 * Caches the loaded `LinesRecord` per `(locale, group)` so the loader is
 * called at most once per pair until `invalidate()` is called.
 *
 * Designed for SPA / browser code-splitting:
 *
 * ```typescript
 * const store = new LoaderStore({
 *     loader: (locale, group) => import(`./locales/${locale}/${group}.json`)
 *         .then((m) => m.default),
 *     locales: ['en', 'de'],
 * });
 * ```
 *
 * Implements `InvalidatingStore` — calling `invalidate(locale?, group?)`
 * drops the matching cached entries and fires the `invalidate` event so
 * subscribers (e.g. a Vue composable in dev mode) can re-fetch.
 */
export class LoaderStore implements InvalidatingStore {
    protected loaderFn: LoaderFn;

    protected locales: string[];

    /** Map of `${locale}|${group}` → cache entry (including miss markers). */
    protected cache = new Map<string, CacheEntry>();

    /** In-flight loads, keyed identically, so concurrent get()s share a promise. */
    protected inflight = new Map<string, Promise<LinesRecord | undefined>>();

    protected listeners = new Set<InvalidateListener>();

    constructor(options: LoaderStoreOptions) {
        this.loaderFn = options.loader;
        this.locales = options.locales ? [...options.locales] : [];
    }

    async get(context: StoreGetContext): Promise<Leaf | undefined> {
        const record = await this.loadGroup(context.locale, context.group);
        if (!record) return undefined;

        const output = getPathValue(record, context.key);
        if (typeof output === 'string') return output;
        return asPluralLeaf(output);
    }

    async set(context: StoreSetContext): Promise<void> {
        // Set mutates the cached record for the (locale, group). If the
        // group hasn't been loaded yet, load it first so we don't overwrite
        // the loader's data on a subsequent get().
        const record = (await this.loadGroup(context.locale, context.group)) ?? {};
        setPathValue(record, context.key, context.value);
        this.cache.set(this.cacheKey(context.locale, context.group), { record });
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
            const sep = key.indexOf('|');
            if (sep >= 0) seen.add(key.slice(0, sep));
        }
        return Array.from(seen);
    }

    invalidate(locale?: string, group?: string): void {
        if (typeof locale === 'undefined') {
            this.cache.clear();
        } else if (typeof group === 'undefined') {
            const prefix = `${locale}|`;
            for (const key of this.cache.keys()) {
                if (key.startsWith(prefix)) this.cache.delete(key);
            }
        } else {
            this.cache.delete(this.cacheKey(locale, group));
        }
        // Fire after cache is dropped so subscribers see the post-invalidate
        // state if they probe the store.
        for (const listener of this.listeners) {
            listener(locale, group);
        }
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

    protected cacheKey(locale: string, group: string): string {
        return `${locale}|${group}`;
    }

    protected async loadGroup(locale: string, group: string): Promise<LinesRecord | undefined> {
        const key = this.cacheKey(locale, group);
        const cached = this.cache.get(key);
        if (cached) return cached.record;

        // De-duplicate concurrent loads — multiple `get()` calls for the
        // same (locale, group) share one loader invocation.
        const existing = this.inflight.get(key);
        if (existing) return existing;

        const promise = Promise.resolve(this.loaderFn(locale, group))
            .then((record) => {
                this.cache.set(key, { record });
                this.inflight.delete(key);
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
