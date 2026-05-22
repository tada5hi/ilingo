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
    value: string,
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
