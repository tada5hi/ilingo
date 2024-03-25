/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    inject, isRef, provide, ref,
} from 'vue';

import type {
    App,
    Ref,
} from 'vue';

const LocaleSymbol = Symbol.for('ILocale');

export function provideLocale(
    locale: string | Ref<string>,
    app: App,
) {
    const value = isRef(locale) ? locale : ref(locale);

    if (typeof app === 'undefined') {
        provide(LocaleSymbol, value);
        return;
    }

    app.provide(LocaleSymbol, value);
}

export function injectLocale() : Ref<string> {
    const locale = inject<string | Ref<string>>(LocaleSymbol);
    if (!locale) {
        return ref('en');
    }

    return isRef(locale) ? locale : ref(locale);
}
