/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { getPathValue, setPathValue } from 'pathtrace';
import type { Leaf, Locales } from '../types';
import { isPluralLeaf } from '../utils/identify';
import type {
    IMutableStore,
    MemoryStoreOptions,
    StoreGetContext,
    StoreSetContext,
} from './types';

export class MemoryStore implements IMutableStore {
    readonly id: string | symbol;

    protected data: Locales;

    constructor(options: MemoryStoreOptions) {
        this.id = options.id || Symbol('MemoryStore');

        this.data = options.data;
    }

    async get(context: StoreGetContext): Promise<Leaf | undefined> {
        return this.getSync(context);
    }

    getSync(context: StoreGetContext): Leaf | undefined {
        if (
            !this.data[context.locale] ||
            !this.data[context.locale][context.namespace]
        ) {
            return undefined;
        }

        const output = getPathValue(
            this.data[context.locale][context.namespace],
            context.key,
        );

        if (typeof output === 'string') {
            return output;
        }

        // Plural forms must use the explicit `{ "@plural": { ... } }`
        // wrapper. Bare `{ one, other }` objects are treated as ordinary
        // nested namespaces — the wrapper is the only signal that an
        // object should be interpreted as a CLDR-categorised plural leaf.
        if (isPluralLeaf(output)) {
            return output['@plural'];
        }

        return undefined;
    }

    setSync(context: StoreSetContext): void {
        this.initLines(context.namespace, context.locale);

        setPathValue(
            this.data[context.locale][context.namespace],
            context.key,
            context.value,
        );
    }

    async set(context: StoreSetContext): Promise<void> {
        this.setSync(context);
    }

    protected initLines(namespace: string, locale: string) {
        if (typeof this.data[locale] === 'undefined') {
            this.data[locale] = {};
        }

        if (typeof this.data[locale][namespace] === 'undefined') {
            this.data[locale][namespace] = {};
        }
    }

    getLocalesSync(): string[] {
        return Object.keys(this.data);
    }

    async getLocales(): Promise<string[]> {
        return this.getLocalesSync();
    }
}
