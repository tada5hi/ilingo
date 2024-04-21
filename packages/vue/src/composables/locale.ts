/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    isRef,
    provide,
    ref,
} from 'vue';

import type {
    App,
    Ref,
} from 'vue';
import { inject } from '../helpers';

const LocaleSymbol = Symbol.for('ILocale');

export function provideLocale(
    locale: string | Ref<string>,
    app?: App,
) {
    const value = isRef(locale) ? locale : ref(locale);

    if (typeof app === 'undefined') {
        provide(LocaleSymbol, value);
        return;
    }

    app.provide(LocaleSymbol, value);
}

export function injectLocale(app?: App) : Ref<string> {
    const locale = inject<Ref<string>>(LocaleSymbol, app);
    if (!locale) {
        throw new Error('An ilingo locale is not present in the vue context.');
    }

    return locale;
}

export function injectLocaleSafe(app?: App) : Ref<string> | undefined {
    return inject<Ref<string>>(LocaleSymbol, app);
}
