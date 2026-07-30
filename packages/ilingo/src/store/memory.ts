/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { getPathValue, setPathValue } from 'pathtrace';
import { normalizeCatalog } from '../catalog/normalize';
import type { Leaf, Locales } from '../types';
import { isPluralNode } from '../utils/identify';
import type {
    IMutableStore,
    ISyncStore,
    MemoryStoreOptions,
    StoreGetContext,
    StoreSetContext,
} from './types';
import { SYNC_UNAVAILABLE } from './types';

export class MemoryStore implements IMutableStore, ISyncStore {
    readonly id: string | symbol;

    protected data: Locales;

    constructor(options: MemoryStoreOptions) {
        this.id = options.id || Symbol('MemoryStore');

        this.data = normalizeCatalog(options.data);
    }

    async get(context: StoreGetContext): Promise<Leaf | undefined> {
        const value = this.getSync(context);

        // `MemoryStore.getSync` never yields the sentinel; a subclass using
        // this map as a cache can, and by the time it delegates here it has
        // already loaded what it needs — so "still unavailable" is a miss.
        return value === SYNC_UNAVAILABLE ? undefined : value;
    }

    /**
     * {@link ISyncStore} read. `MemoryStore` itself holds everything in
     * memory, so it never returns `SYNC_UNAVAILABLE` — `undefined` is always
     * a definite miss. The sentinel is part of the signature because
     * subclasses that use this map as a *cache* do return it for data they
     * haven't pulled in yet (see `FSStore` on a cold namespace).
     */
    getSync(context: StoreGetContext): Leaf | undefined | typeof SYNC_UNAVAILABLE {
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

        // Plural leaves are the tagged `{ type: 'plural', data }` node.
        // A bare nested object is an ordinary key group, never a plural —
        // the `type` discriminator is the only signal of a plural leaf.
        if (isPluralNode(output)) {
            return output.data;
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
