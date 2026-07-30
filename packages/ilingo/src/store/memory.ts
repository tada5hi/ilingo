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
    MemoryStoreOptions,
    StoreGetContext,
    StoreSetContext,
} from './types';

export class MemoryStore implements IMutableStore {
    readonly id: string | symbol;

    protected data: Locales;

    constructor(options: MemoryStoreOptions) {
        this.id = options.id || Symbol('MemoryStore');

        this.data = normalizeCatalog(options.data);
    }

    async get(context: StoreGetContext): Promise<Leaf | undefined> {
        return this.resolve(context);
    }

    /**
     * Synchronous read. Everything is in memory, so this never throws
     * `SyncUnavailableError` — an `undefined` is always a definite miss.
     * Subclasses that use this map as a *cache* do throw for data they haven't
     * pulled in yet (see `FSStore` on a cold namespace).
     */
    getSync(context: StoreGetContext): Leaf | undefined {
        return this.resolve(context);
    }

    /**
     * The actual map lookup, shared by both public faces so they can never
     * disagree about what this store holds.
     *
     * Kept separate from `getSync` because a subclass may legitimately
     * *override* `getSync` to decline (`FSStore` throws while a namespace is
     * cold) — and `get`, being the asynchronous face that loads first, must not
     * inherit that refusal. Routing `get` through the overridable method made
     * `FSStore.get()` throw for a namespace it had just chosen not to cache.
     */
    protected resolve(context: StoreGetContext): Leaf | undefined {
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
