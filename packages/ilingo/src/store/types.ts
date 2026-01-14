/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { LocalesRecord } from '../types';

export type StoreGetContext = {
    locale: string,
    group: string,
    key: string
};

export type StoreSetContext = StoreGetContext & {
    value: string
};

export interface IStore {
    get(context: StoreGetContext) : Promise<string | undefined>;

    set(context: StoreSetContext) : Promise<void>;

    getLocales() : Promise<string[]>;
}

export type MemoryStoreOptions = {
    data: LocalesRecord
};
