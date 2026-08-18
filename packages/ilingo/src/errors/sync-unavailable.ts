/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { markInstanceof } from '@ebec/core';
import { IlingoError } from './base';
import { isSyncUnavailableError } from './check';
import { SYNC_UNAVAILABLE_ERROR_INSTANCE } from './constants';

export type SyncUnavailableErrorOptions = ErrorOptions & {
    locale?: string,
    namespace?: string,
    key?: string,
    /** `id` of the store that declined, when a specific store is responsible. */
    storeId?: string | symbol,
};

/**
 * Thrown by a synchronous read that *may* hold the value but cannot produce it
 * without I/O — a cold `FSStore` namespace, a `LoaderStore` pair that hasn't
 * been imported, an adapter with no synchronous read at all.
 *
 * It is deliberately **not** the same signal as a miss. A miss is `undefined`
 * ("I can answer, and this key isn't here") and lets the caller keep walking;
 * this error means "don't trust a synchronous answer for this lookup at all".
 * Collapsing the two would let the locale walk skip a cold store and return a
 * *farther* locale's string — a silently wrong translation, which is worse than
 * the placeholder the synchronous path exists to remove.
 *
 * Signalling it as a throw rather than a sentinel return value keeps
 * `getSync`'s return type honest (`Leaf | undefined`, matching `get`) and
 * leaves `undefined` with exactly one meaning, which is what lets higher layers
 * — `@ilingo/validup`'s `translateIssueSync`, `@ilingo/vuelidate`'s message
 * seed — apply the *same* fallback the async path would for a genuine miss.
 * Same convention as locter's `readSync` (`LoadError` / `UnknownExtensionError`).
 *
 * Catch it with {@link isSyncUnavailableError}; expect it as ordinary control
 * flow on any code path that seeds from a synchronous read.
 */
export class SyncUnavailableError extends IlingoError {
    static override [Symbol.hasInstance](input: unknown): boolean {
        return isSyncUnavailableError(input);
    }

    readonly locale?: string;

    readonly namespace?: string;

    readonly key?: string;

    readonly storeId?: string | symbol;

    constructor(message: string, options: SyncUnavailableErrorOptions = {}) {
        const {
            locale, 
            namespace, 
            key, 
            storeId, 
            ...rest
        } = options;

        super(message, rest);

        this.locale = locale;
        this.namespace = namespace;
        this.key = key;
        this.storeId = storeId;

        // The ancestors' markers ride the same `@instanceof` chain, so
        // `IlingoError`'s does not need restating here.
        markInstanceof(this, SYNC_UNAVAILABLE_ERROR_INSTANCE);
    }

    /**
     * Carry the structured lookup fields alongside `BaseError`'s own payload,
     * so an error crossing a JSON boundary still says *which* lookup declined.
     * `storeId` stringifies because a store's `id` is often a symbol.
     */
    override toJSON() {
        return {
            ...super.toJSON(),
            locale: this.locale,
            namespace: this.namespace,
            key: this.key,
            storeId: typeof this.storeId === 'undefined' ? undefined : String(this.storeId),
        };
    }
}

/**
 * Throw a {@link SyncUnavailableError} for a lookup that cannot be served
 * without I/O. The one-liner an adapter with no synchronous read needs:
 *
 * ```typescript
 * class HttpStore implements IStore {
 *     readonly id = Symbol('HttpStore');
 *
 *     async get(context) { ... }
 *
 *     getSync(context): Leaf | undefined {
 *         throwSyncUnavailable(context, this.id);
 *     }
 *
 *     async getLocales() { return [...]; }
 * }
 * ```
 *
 * Returns `never`, so TypeScript accepts it as the whole body of a method
 * declared to return a value.
 */
export function throwSyncUnavailable(
    context: {
        locale?: string, 
        namespace?: string, 
        key?: string 
    } = {},
    storeId?: string | symbol,
): never {
    const target = `${context.locale ?? '*'}/${context.namespace ?? '*'}.${context.key ?? '*'}`;

    throw new SyncUnavailableError(
        `[ilingo] "${target}" cannot be resolved synchronously` +
        `${typeof storeId === 'undefined' ? '' : ` by store "${String(storeId)}"`} — ` +
        'await get() instead.',
        { ...context, storeId },
    );
}
