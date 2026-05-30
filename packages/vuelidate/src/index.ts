/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Options } from '@ilingo/vue';
import { applyInstallInput } from '@ilingo/vue';
import type { IIlingo } from 'ilingo';
import type { App, Plugin } from 'vue';
import { createMemoryStore } from './store/memory';

/**
 * Vue plugin install hook. Registers the **eager** vuelidate-message
 * catalog (`@ilingo/vuelidate/store/memory`) on the app's `Ilingo`
 * instance — Vue apps default to bundling all locales. Idempotent:
 * `Ilingo.registerStore` dedupes by the store's `STORE_ID` identity.
 *
 * Apps that want per-locale code-splitting can skip the catalog this
 * registers and instead `ilingo.registerStore(createLoaderStore())` from
 * `@ilingo/vuelidate/store/loader` on the instance they pass in.
 */
export function install(
    app: App,
    input?: Options | IIlingo,
) : void {
    const instance = applyInstallInput(app, input);
    instance.registerStore(createMemoryStore());
}

export default { install } satisfies Plugin<Options | IIlingo | undefined>;

export * from './component';
export * from './composables';
export * from './helpers';
export * from './types';
