/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Options } from '@ilingo/vue';
import { applyInstallInput, injectIlingoSafe, provideIlingo } from '@ilingo/vue';
import type { Ilingo } from 'ilingo';
import type { App, Plugin } from 'vue';
import { VUELIDATE_STORE_KEY } from './constants';
import { createVuelidateStore } from './store';

export function install(
    app: App,
    input?: Options | Ilingo,
) : void {
    const instance = applyInstallInput(app, input);
    if (!instance.stores.has(VUELIDATE_STORE_KEY)) {
        instance.stores.set(VUELIDATE_STORE_KEY, createVuelidateStore());
    }

    provideIlingo(instance, app);
}

export default {
    install,
} satisfies Plugin<Options | Ilingo | undefined>;

export { default as IVuelidate } from './component.vue';
export * from './use-validation-messages';
export * from './types';
