/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { getPathValue, setPathValue } from 'pathtrace';
import type { LocalesRecord } from '../types';
import type {
    IStore,
    MemoryStoreOptions,
    StoreGetContext,
    StoreSetContext,
} from './types';

export class MemoryStore implements IStore {
    protected data : LocalesRecord;

    constructor(options: MemoryStoreOptions) {
        this.data = options.data;
    }

    async get(context: StoreGetContext): Promise<string | undefined> {
        if (
            !this.data[context.locale] ||
            !this.data[context.locale][context.group]
        ) {
            return undefined;
        }

        const output = getPathValue(
            this.data[context.locale][context.group],
            context.key,
        );

        if (typeof output === 'string') {
            return output;
        }

        return undefined;
    }

    async set(context: StoreSetContext): Promise<void> {
        this.initLines(context.group, context.locale);

        setPathValue(
            this.data[context.locale][context.group],
            context.key,
            context.value,
        );
    }

    protected initLines(group: string, locale: string) {
        if (typeof this.data[locale] === 'undefined') {
            this.data[locale] = {};
        }

        if (typeof this.data[locale][group] === 'undefined') {
            this.data[locale][group] = {};
        }
    }

    async getLocales(): Promise<string[]> {
        return Object.keys(this.data);
    }
}
