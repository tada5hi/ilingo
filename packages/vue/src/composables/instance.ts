/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Ilingo } from 'ilingo';
import {
    inject, provide,
} from 'vue';

import type {
    App,
} from 'vue';

const IlingoSymbol = Symbol.for('Ilingo');

export function provideIlingo(
    ilingo: Ilingo,
    app: App,
) {
    if (typeof app === 'undefined') {
        provide(IlingoSymbol, ilingo);
        return;
    }

    app.provide(IlingoSymbol, ilingo);
}

export function injectIlingo() : Ilingo {
    const instance = inject<Ilingo>(IlingoSymbol);
    if (!instance) {
        return new Ilingo();
    }

    return instance;
}
