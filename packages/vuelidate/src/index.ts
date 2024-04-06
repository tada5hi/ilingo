/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { install as installVue } from '@ilingo/vue';
import type { App, Plugin } from 'vue';
import { providePrefix } from './di';
import type { Options } from './types';

export function install(app: App, options: Options = {}) : void {
    const { prefix, ...opts } = options;

    installVue(app, opts);

    if (prefix) {
        providePrefix(prefix, app);
    }
}

export default {
    install,
} satisfies Plugin<Options | undefined>;

export * from './di';
export { default as IVuelidate } from './component.vue';
export * from './use-validation-messages';
export * from './types';
