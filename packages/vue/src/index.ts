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
import { ITranslateT } from './component-t';
import { createVTDirective } from './directives/t';
import {
    injectIlingoSafe,
    injectLocale,
    injectLocaleSafe,
    provideIlingo,
    provideLocale,
} from './composables';
import type { Options } from './types';

export function applyInstallInput(
    app: App,
    input?: Options | Ilingo,
): Ilingo {
    let locale = injectLocaleSafe(app);
    const localeExisted = typeof locale !== 'undefined' && !!locale.value;
    let instance = injectIlingoSafe(app);
    const instanceExisted = typeof instance !== 'undefined';

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
            instance = new Ilingo({ store: input.store });
        }
    }

    if (!locale) {
        locale = ref('en');
    }

    if (!localeExisted) {
        provideLocale(locale, app);
    }

    if (!instanceExisted) {
        provideIlingo(instance, app);
    }

    return instance;
}

export function install(app: App, input?: Options | Ilingo): void {
    const instance = applyInstallInput(app, input);

    app.component('ITranslate', ITranslate);
    app.component('ITranslateT', ITranslateT);

    const directivesEnabled = !(input && !(input instanceof Ilingo) && input.directives === false);
    if (directivesEnabled) {
        // applyInstallInput always ensures a locale Ref is provided to the
        // app, so the non-safe injectLocale is justified here. If that
        // contract ever changes, this throws instead of producing a
        // misbehaving directive.
        const locale = injectLocale(app);
        app.directive('t', createVTDirective(instance, locale));
    }
}

export default { install } satisfies Plugin<Options | Ilingo | undefined>;

export { default as ITranslate } from './component.vue';
export { ITranslateT } from './component-t';
export { createVTDirective } from './directives/t';
export type { VTBinding } from './directives/t';
export * from './composables';
export * from './types';
export * from './helpers';
