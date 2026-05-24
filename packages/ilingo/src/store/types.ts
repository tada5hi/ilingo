/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Leaf, LocalesRecord } from '../types';

export type StoreGetContext = {
    locale: string,
    group: string,
    key: string,
};

export type StoreSetContext = StoreGetContext & {
    value: Leaf,
};

export interface IStore {
    /**
     * Resolve a `(locale, group, key)` to a leaf value.
     *
     * The leaf can be a plain string or a CLDR-categorised plural leaf
     * (`{ one, other, ... }`). Implementations that don't support plural
     * catalogs may return only `string | undefined`.
     */
    get(context: StoreGetContext): Promise<Leaf | undefined>;

    set(context: StoreSetContext): Promise<void>;

    getLocales(): Promise<string[]>;
}

export type MemoryStoreOptions = {
    data: LocalesRecord,
};

/**
 * Listener for a store's `invalidate` event. Receives the scope of the
 * invalidation: a `locale` (drop entries for that locale), a
 * `(locale, group)` tuple (drop only that group), or `undefined` for both
 * (drop everything).
 */
export type InvalidateListener = (locale?: string, group?: string) => void;

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
     * - `invalidate(locale)` — drop all groups for `locale`.
     * - `invalidate(locale, group)` — drop just one group.
     *
     * After invalidation the next `get()` for the affected key re-runs the
     * underlying load (a fresh file read, a re-import, etc.).
     */
    invalidate(locale?: string, group?: string): void;

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
