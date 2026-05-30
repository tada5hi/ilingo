/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { injectIlingoSafe } from '@ilingo/vue';
import { createMemoryStore } from '@ilingo/validup/store/memory';
import type { App, Plugin } from 'vue';

/**
 * Vue plugin install hook. Registers the default validation-message
 * catalog (EN / DE / FR / ES translations for the built-in validup
 * `IssueCode`s) onto the `Ilingo` instance previously installed by
 * `@ilingo/vue`.
 *
 * **Order matters:** call `app.use(ilingoVue, …)` before
 * `app.use(ilingoValidupVue)`. Without an existing `Ilingo` instance
 * in the app context, this throws with a pointer to the missing setup
 * — better than silently constructing a second instance that
 * `<ITranslate>` and `useTranslation()` wouldn't see.
 *
 * Uses the **eager** memory store (`@ilingo/validup/store/memory`) — Vue
 * apps default to bundling all locales. Apps that want per-locale
 * code-splitting can skip this and instead
 * `ilingo.registerStore(createLoaderStore())` from `@ilingo/validup/store/loader`
 * on the instance they pass to `@ilingo/vue`.
 *
 * Idempotent: re-calling `install()` (e.g. from a hot-reloaded test
 * setup) won't stack duplicates — `Ilingo.registerStore` dedupes by the
 * store's `STORE_ID` identity.
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

    instance.registerStore(createMemoryStore());
}

export default { install } satisfies Plugin<[]>;

// Vue-coupled surface.
export * from './component';
export * from './composables';
export * from './types';
