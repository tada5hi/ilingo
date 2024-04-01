/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export type StoreGetContext = {
    locale: string,
    group: string,
    key: string
};

export type StoreSetContext = StoreGetContext & {
    value: string
};

export interface Store {
    get(context: StoreGetContext) : Promise<string | undefined>;
    getSync(context: StoreGetContext) : string | undefined;

    set(context: StoreSetContext) : Promise<void>;
    setSync(context: StoreSetContext) : void;

    getLocales() : Promise<string[]>;
    getLocalesSync(): string[];
}
