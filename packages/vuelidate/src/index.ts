/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { useIlingo } from 'ilingo';
import type { App, Plugin } from 'vue';
import { providePrefix } from './di';
import type { Options } from './types';

export function install(app: App, options: Options = {}) : void {
    const prefix = options.prefix || 'vuelidate';
    providePrefix(prefix, app);

    // todo: register translations (en,de)
}

export default {
    install,
} satisfies Plugin<Options | undefined>;

export * from './di';
export { default as IVuelidate } from './component.vue';
export * from './use-validation-messages';
export * from './types';
