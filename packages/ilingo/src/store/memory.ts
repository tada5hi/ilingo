/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { LocalesRecord } from '../type';
import { getObjectPathProperty, setObjectPathProperty } from '../utils';
import type { Store, StoreGetContext, StoreSetContext } from './type';

export class MemoryStore implements Store {
    protected data : LocalesRecord;

    constructor() {
        this.data = {};
    }

    async get(context: StoreGetContext): Promise<string | undefined> {
        return this.getSync(context);
    }

    getSync(context: StoreGetContext): string | undefined {
        if (
            !this.data[context.locale] ||
            !this.data[context.locale][context.group]
        ) {
            return undefined;
        }

        const output = getObjectPathProperty(
            this.data[context.locale][context.group],
            context.key,
        );

        if (typeof output === 'string') {
            return output;
        }

        return undefined;
    }

    async set(context: StoreSetContext): Promise<void> {
        this.setSync(context);
    }

    setSync(context: StoreSetContext): void {
        this.initLines(context.group, context.locale);

        setObjectPathProperty(
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
}
