/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Options } from '@ilingo/vue';
import { applyInstallInput } from '@ilingo/vue';
import type { Ilingo } from 'ilingo';
import type { App, Plugin } from 'vue';
import { Store, createStore } from './store';

/**
 * Vue plugin install hook. Idempotently:
 *
 * 1. Sets up (or merges into) the `Ilingo` instance and locale `Ref` via
 *    `@ilingo/vue`'s `applyInstallInput`.
 * 2. Adds the default `Store` (with EN / DE / FR / ES translations for
 *    the built-in validup `IssueCode`s) if no `@ilingo/validup` `Store`
 *    is already registered.
 *
 * Identity-checks via `instanceof Store`, so re-calling `install()` —
 * for example from a hot-reloaded test setup — won't stack duplicates.
 */
export function install(
    app: App,
    input?: Options | Ilingo,
): void {
    const instance = applyInstallInput(app, input);

    let found = false;
    for (const store of instance.stores) {
        if (store instanceof Store) {
            found = true;
            break;
        }
    }

    if (!found) {
        instance.stores.add(createStore());
    }
}

export default { install } satisfies Plugin<Options | Ilingo | undefined>;

export * from './component';
export * from './composables';
export * from './constants';
export * from './helpers';
export * from './store';
export * from './translations';
export * from './types';
