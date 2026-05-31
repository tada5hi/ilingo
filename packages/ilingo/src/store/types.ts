/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Leaf, Locales, PluralLeaf } from '../types';

export type StoreGetContext = {
    locale: string,
    namespace: string,
    key: string,
};

export type StoreSetContext = StoreGetContext & {
    /**
     * Value to persist at the `(locale, namespace, key)` position. Plain
     * translations are strings; plural translations must use the
     * `{ "@plural": { ... } }` wrapper so they round-trip with `get()`
     * (which only recognises the wrapped form when reading back).
     */
    value: string | PluralLeaf,
};

/**
 * Read/write port for translation backends. The surface is intentionally
 * minimal — `get`, `set`, `getLocales` — and is **frozen** for the stable
 * release: external adapters can rely on these three methods being the
 * complete required contract.
 *
 * Extensions are layered as optional interfaces detected via type guards
 * (today: `InvalidatingStore` for caches that can be dropped). New
 * capabilities like `has`, `delete`, `getKeys`, or batch `getAll` will
 * follow the same opt-in pattern rather than expanding this interface —
 * each was considered for inclusion and deferred:
 *
 * - `has(ctx)` — `get(ctx)` already returns `undefined` for misses; a
 *   separate `has` doubles the round-trip count for network-backed stores
 *   without buying meaningful API ergonomics.
 * - `delete(ctx)` / `getKeys(namespace)` — no in-tree consumer; speculative.
 * - `getAll(locale, namespace)` — bulk loading is the job of `LoaderStore`,
 *   which pre-warms a whole namespace on first access.
 *
 * Re-evaluate each only when a concrete consumer surfaces.
 */
export interface IStore {
    readonly id: string | symbol;

    /**
     * Resolve a `(locale, namespace, key)` to a leaf value.
     *
     * The returned value is `Leaf` — `string | PluralForms` — which is
     * the *post-unwrap* shape: stores that hold the catalog-side
     * `PluralLeaf` (`{ "@plural": ... }`) wrapper are expected to strip
     * the marker before returning, matching `MemoryStore` and
     * `LoaderStore`. Stores that don't support plurals can return just
     * `string | undefined`.
     */
    get(context: StoreGetContext): Promise<Leaf | undefined>;

    /**
     * Persist a `(locale, namespace, key)` → leaf mapping. Implementations
     * that are read-only may throw; callers writing through `Ilingo` do
     * not invoke `set` themselves.
     */
    set(context: StoreSetContext): Promise<void>;

    /**
     * Enumerate the locales the store can currently resolve. Used by
     * `Ilingo.getLocales()` to aggregate across every registered store
     * and by `negotiateLocale()` callers that want the supported list.
     */
    getLocales(): Promise<string[]>;
}

export type MemoryStoreOptions = {
    id?: string | symbol,
    data: Locales,
};

/**
 * Listener for a store's `invalidate` event. Receives the scope of the
 * invalidation: a `locale` (drop entries for that locale), a
 * `(locale, namespace)` tuple (drop only that namespace), or `undefined` for both
 * (drop everything).
 */
export type InvalidateListener = (locale?: string, namespace?: string) => void;

/**
 * Stores that cache lookups and can drop those caches expose this surface
 * so consumers (e.g. the Vue composable in dev mode, the file-watching
 * `FSStore`, future loader-based stores) can both *trigger* an invalidation
 * and *react* to one.
 *
 * Optional — not every `IStore` caches. Detect with `isInvalidatingStore`.
 */
export interface InvalidatingStore extends IStore {
    /**
     * Drop cached entries.
     *
     * - `invalidate()` — drop everything.
     * - `invalidate(locale)` — drop all namespaces for `locale`.
     * - `invalidate(locale, namespace)` — drop just one namespace.
     *
     * After invalidation the next `get()` for the affected key re-runs the
     * underlying load (a fresh file read, a re-import, etc.).
     */
    invalidate(locale?: string, namespace?: string): void;

    /**
     * Subscribe to invalidation events. Listeners are fired *after* the
     * cache has been dropped. Returns an unsubscribe function.
     *
     * Fires for every invalidation — both explicit `invalidate()` calls and
     * source-driven ones (e.g. file change under `FSStore({ watch: true })`).
     */
    on(event: 'invalidate', listener: InvalidateListener): () => void;
}

export function isInvalidatingStore(store: IStore): store is InvalidatingStore {
    return typeof (store as Partial<InvalidatingStore>).invalidate === 'function' &&
        typeof (store as Partial<InvalidatingStore>).on === 'function';
}
