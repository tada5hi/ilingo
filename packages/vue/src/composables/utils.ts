/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Data, GetContext, IIlingo } from 'ilingo';
import { isProductionEnv, isSyncUnavailableError } from 'ilingo';
import { unref } from 'vue';
import type { DataMaybeRef } from '../types';

/**
 * Errors already reported by {@link resolveSync}, so a broken store warns once
 * instead of once per translated binding on the page.
 */
const warned = new Set<string>();

/**
 * Best-effort synchronous lookup, used to seed the `computedAsync`s in this
 * package so the first render is the real translation rather than the
 * `namespace.key` placeholder — the difference between correct and
 * mismatching server-rendered markup (issue #988).
 *
 * Never throws. Two distinct reasons it can come back empty:
 *
 * - `SyncUnavailableError` — expected control flow. A store needs I/O (a cold
 *   `FSStore` / `LoaderStore`, an adapter with no synchronous read), so there
 *   is nothing to seed and the async pass will resolve it.
 * - anything else — a genuine fault in a store or formatter. Swallowed too,
 *   because this runs on the component's synchronous setup path where an
 *   escaping throw aborts the mount, but reported once in development: the
 *   async pass hands the same error to VueUse's `onError`, which forwards to
 *   `globalThis.reportError` — absent in a Node SSR run, so it would otherwise
 *   vanish exactly where it matters most.
 *
 * `getSync` is a required member of `IIlingo`, so there is nothing to feature
 * detect: an instance that lacks it (a hand-rolled double, a stale copy pulled
 * in through the peer range) trips the `catch` below and is reported like any
 * other fault.
 */
export function resolveSync(instance: IIlingo, ctx: GetContext): string | undefined {
    try {
        return instance.getSync(ctx);
    } catch (e) {
        if (!isSyncUnavailableError(e) && !isProductionEnv()) {
            reportSeedFailure(e);
        }

        return undefined;
    }
}

function reportSeedFailure(e: unknown): void {
    const message = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
    if (warned.has(message)) {
        return;
    }

    warned.add(message);
    // eslint-disable-next-line no-console
    console.warn(
        '[ilingo/vue] a synchronous translation lookup failed; falling back to the ' +
        `asynchronous one. ${message}`,
    );
}

export function extractReactiveData(input: DataMaybeRef) : Data {
    const output : Data = {};
    const keys = Object.keys(input);
    for (const key of keys) {
        output[key] = unref(input[key]);
    }

    return output;
}
