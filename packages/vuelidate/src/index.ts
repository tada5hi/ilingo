/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { injectIlingoSafe, provideIlingo } from '@ilingo/vue';
import { MemoryStore, useIlingo } from 'ilingo';
import type { App, Plugin } from 'vue';
import { VUELIDATE_STORE_KEY } from './constants';
import {
    useEnglishTranslation, useFrenchTranslation, useGermanTranslation, useSpanishTranslation,
} from './translations';

export function install(app: App) : void {
    let instance = injectIlingoSafe(app);
    if (!instance) {
        instance = useIlingo();
    }

    if (!instance.stores.has(VUELIDATE_STORE_KEY)) {
        const memoryStore = new MemoryStore({
            en: { vuelidate: useEnglishTranslation() },
            de: { vuelidate: useGermanTranslation() },
            fr: { vuelidate: useFrenchTranslation() },
            es: { vuelidate: useSpanishTranslation() },
        });

        instance.stores.set(VUELIDATE_STORE_KEY, memoryStore);
    }

    provideIlingo(instance, app);
}

export default {
    install,
} satisfies Plugin<undefined>;

export { default as IVuelidate } from './component.vue';
export * from './use-validation-messages';
export * from './types';
