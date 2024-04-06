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

const symbol = Symbol.for('IVuelidatePrefix');

export function providePrefix(
    input: string | Ref<string>,
    app: App,
) {
    const value = isRef(input) ? input : ref(input);

    if (typeof app === 'undefined') {
        provide(symbol, value);
        return;
    }

    app.provide(symbol, value);
}

export function injectPrefix() : Ref<string> {
    const value = inject<string | Ref<string>>(symbol);
    if (!value) {
        return ref('vuelidate');
    }

    return isRef(value) ? value : ref(value);
}
