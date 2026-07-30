/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { CatalogInput, Leaf, PluralNode } from '../types';

export type StoreGetContext = {
    locale: string,
    namespace: string,
    key: string,
};

export type StoreSetContext = StoreGetContext & {
    /**
     * Value to persist at the `(locale, namespace, key)` position. Plain
     * translations are strings; plural translations use the tagged
     * `{ type: 'plural', data }` node (build it with `definePlural()`) so
     * they round-trip with `get()`, which unwraps that node when reading.
     */
    value: string | PluralNode,
};

/**
 * **Read** port for translation backends — the contract `Ilingo` relies on.
 * ilingo's job is to *read* a datasource: the orchestrator only ever calls
 * `get` (and `getLocales`), never `set`. So the required surface is just
 * `id` + `get` + `getLocales`, and it is **frozen** at those — external
 * adapters can rely on this being the complete required contract.
 *
 * Writing is an *optional* capability layered as a separate interface
 * detected via a type guard — see {@link IMutableStore} / {@link isMutableStore}
 * (only stores that hold mutable state, like `MemoryStore` / `FSStore`,
 * implement it). This mirrors {@link IInvalidatingStore} for caches.
 *
 * Other capabilities (`has`, `delete`, `getKeys`, batch `getAll`) follow
 * the same opt-in pattern rather than expanding this interface — each was
 * considered for inclusion and deferred:
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
     * `PluralNode` (`{ type: 'plural', data }`) are expected to return its
     * `data` before returning, matching `MemoryStore` and `LoaderStore`.
     * Stores that don't support plurals can return just `string | undefined`.
     */
    get(context: StoreGetContext): Promise<Leaf | undefined>;

    /**
     * Enumerate the locales the store can currently resolve. Used by
     * `Ilingo.getLocales()` to aggregate across every registered store
     * and by `negotiateLocale()` callers that want the supported list.
     */
    getLocales(): Promise<string[]>;
}

/**
 * Optional **write** capability for stores that hold mutable state. ilingo
 * is read-first — the orchestrator never writes — so `set` is *not* part of
 * the required {@link IStore} port; a read-only adapter (a remote/HTTP
 * datasource, a {@link LoaderStore} you don't mutate) need not implement it.
 *
 * Implemented by `MemoryStore` (in-memory mutation) and `FSStore` (writes
 * through to disk). `extendStore(...)` and any caller that seeds a store at
 * runtime should type the argument as `IMutableStore`. Detect at runtime
 * with {@link isMutableStore}.
 *
 * The port stays **async** so it can cover async backends uniformly. A
 * store that *also* supports synchronous writes (e.g. `MemoryStore`) may
 * expose a concrete `setSync(...)` for seeding data after construction
 * without an `await` — that is store-specific, not part of this contract.
 */
export interface IMutableStore extends IStore {
    /**
     * Persist a `(locale, namespace, key)` → leaf mapping.
     */
    set(context: StoreSetContext): Promise<void>;
}

/**
 * Type guard for {@link IMutableStore} — true when the store exposes a
 * `set` method.
 */
export function isMutableStore(store: IStore): store is IMutableStore {
    return typeof (store as Partial<IMutableStore>).set === 'function';
}

/**
 * Sentinel returned by {@link ISyncStore.getSync} when the store *may* hold
 * the key but cannot answer without I/O — a cold `FSStore` namespace, a
 * `LoaderStore` pair that hasn't been imported yet.
 *
 * Deliberately distinct from `undefined`, which means a **definite miss**
 * ("I can answer, and I don't have this key"). The orchestrator needs the
 * difference: a definite miss lets the walk continue to the next store /
 * locale, while an unavailable answer aborts the whole synchronous lookup.
 * Continuing past it could resolve to a *different* value than the async
 * walk — a fallback-locale string from a warm store while the cold store
 * holds the exact-locale one — which is the very mismatch `getSync` exists
 * to prevent.
 *
 * `Symbol.for` (global registry) so duplicate package copies — pnpm, a
 * peer-dep mismatch — still compare equal.
 */
export const SYNC_UNAVAILABLE = Symbol.for('ilingo.sync-unavailable');

/**
 * Optional **synchronous read** capability, for stores that hold their data
 * in memory. Layered as an opt-in interface detected by a type guard, like
 * {@link IMutableStore} and {@link IInvalidatingStore} — the required
 * {@link IStore} port stays async so network- and disk-backed adapters can
 * implement it uniformly.
 *
 * Exists for server-side rendering: `Ilingo.get()` is a `Promise`, so a Vue
 * `computedAsync` renders its placeholder first, which lands in the SSR
 * markup and then mismatches on hydration. `Ilingo.getSync()` walks the same
 * chain synchronously and lets the first render be the real string on both
 * sides of the boundary.
 *
 * **Contract**: when `getSync` returns anything other than
 * {@link SYNC_UNAVAILABLE}, it MUST return what `get` would have returned
 * for the same context. A store that can only answer for part of its data
 * (a warmed cache) returns {@link SYNC_UNAVAILABLE} for the rest rather
 * than reporting a miss — see `FSStore` (cold namespace) and `LoaderStore`
 * (unloaded pair). Detect at runtime with {@link isSyncStore}.
 */
export interface ISyncStore extends IStore {
    /**
     * Resolve a `(locale, namespace, key)` without I/O.
     *
     * - `Leaf` — a hit; identical to what `get` would resolve.
     * - `undefined` — a definite miss; the caller may continue its walk.
     * - {@link SYNC_UNAVAILABLE} — cannot answer synchronously; the caller
     *   must abandon the synchronous lookup and fall back to `get`.
     */
    getSync(context: StoreGetContext): Leaf | undefined | typeof SYNC_UNAVAILABLE;
}

/**
 * Type guard for {@link ISyncStore} — true when the store exposes a
 * `getSync` method.
 */
export function isSyncStore(store: IStore): store is ISyncStore {
    return typeof (store as Partial<ISyncStore>).getSync === 'function';
}

export type MemoryStoreOptions = {
    id?: string | symbol,
    data: CatalogInput,
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
export interface IInvalidatingStore extends IStore {
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

export function isInvalidatingStore(store: IStore): store is IInvalidatingStore {
    return typeof (store as Partial<IInvalidatingStore>).invalidate === 'function' &&
        typeof (store as Partial<IInvalidatingStore>).on === 'function';
}
