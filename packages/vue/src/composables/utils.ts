/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Data, GetContext, IIlingo } from 'ilingo';
import { unref } from 'vue';
import type { DataMaybeRef } from '../types';

/**
 * Best-effort synchronous lookup, used to seed the `computedAsync`s in this
 * package so the first render is the real translation rather than the
 * `namespace.key` placeholder — the difference between correct and
 * mismatching server-rendered markup (issue #988).
 *
 * `getSync` is optional on `IIlingo`: an implementation that cannot answer
 * without I/O (a remote-backed decorator, a test double, an older core
 * version resolved through the peer range) simply doesn't have it, and the
 * caller falls back to its placeholder.
 */
export function resolveSync(instance: IIlingo, ctx: GetContext): string | undefined {
    if (typeof instance.getSync !== 'function') {
        return undefined;
    }

    try {
        return instance.getSync(ctx);
    } catch {
        // A seed must never be able to make things worse than not seeding.
        // The lookup runs on this component's synchronous setup path, so a
        // throwing custom store or formatter would break the mount outright —
        // whereas the same throw inside the `computedAsync` below is handled
        // by its `onError` (and surfaces via `globalThis.reportError`). Fall
        // through to the placeholder and let the async pass report it.
        return undefined;
    }
}

export function extractReactiveData(input: DataMaybeRef) : Data {
    const output : Data = {};
    const keys = Object.keys(input);
    for (const key of keys) {
        output[key] = unref(input[key]);
    }

    return output;
}
