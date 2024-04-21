/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Ilingo } from 'ilingo';
import type { App, Plugin } from 'vue';
import { ref } from 'vue';
import ITranslate from './component.vue';
import {
    injectIlingoSafe,
    injectLocaleSafe,
    provideIlingo,
    provideLocale,
} from './composables';
import type { Options } from './types';

export function applyInstallInput(
    app: App,
    input?: Options | Ilingo,
) : Ilingo {
    let locale = injectLocaleSafe(app);
    let instance = injectIlingoSafe(app);

    if (!input) {
        instance = new Ilingo();
    } else if (input instanceof Ilingo) {
        if (instance) {
            instance.merge(input);
        } else {
            instance = input;
        }

        if (!locale) {
            locale = ref(instance.getLocale());
        }
    } else {
        if (!locale && input.locale) {
            locale = ref(input.locale);
        }

        if (instance) {
            instance.stores.add(input.store);
        } else {
            instance = new Ilingo({
                store: input.store,
            });
        }
    }

    if (!locale) {
        locale = ref('en');
    }

    provideLocale(locale, app);
    provideIlingo(instance, app);

    return instance;
}

export function install(app: App, input: Options | Ilingo) : void {
    applyInstallInput(app, input);

    app.component('ITranslate', ITranslate);
}

export default {
    install,
} satisfies Plugin<Options | Ilingo>;

export { default as ITranslate } from './component.vue';
export * from './composables';
export * from './types';
export * from './helpers';
