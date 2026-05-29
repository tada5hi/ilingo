/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { injectIlingoSafe } from '@ilingo/vue';
import { Store, createStore } from '@ilingo/validup';
import type { App, Plugin } from 'vue';

/**
 * Vue plugin install hook. Registers the default validation-message
 * `Store` (EN / DE / FR / ES translations for the built-in validup
 * `IssueCode`s) onto the `Ilingo` instance previously installed by
 * `@ilingo/vue`.
 *
 * **Order matters:** call `app.use(ilingoVue, …)` before
 * `app.use(ilingoValidupVue)`. Without an existing `Ilingo` instance
 * in the app context, this throws with a pointer to the missing setup
 * — better than silently constructing a second instance that
 * `<ITranslate>` and `useTranslation()` wouldn't see.
 *
 * Idempotent: re-calling `install()` (e.g. from a hot-reloaded test
 * setup) won't stack duplicate `Store` instances — the existing one is
 * detected via `instanceof Store`.
 */
export function install(app: App): void {
    const instance = injectIlingoSafe(app);
    if (!instance) {
        throw new Error(
            '@ilingo/validup-vue: no Ilingo instance found in the app context. ' +
            'Install @ilingo/vue first — e.g. `app.use(ilingoVue, { ... })` ' +
            'before `app.use(ilingoValidupVue)`.',
        );
    }

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

export default { install } satisfies Plugin<[]>;

// Vue-coupled surface.
export * from './component';
export * from './composables';
export * from './types';
