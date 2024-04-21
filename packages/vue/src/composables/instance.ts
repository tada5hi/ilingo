/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Ilingo } from 'ilingo';
import {
    provide,
} from 'vue';

import type {
    App,
} from 'vue';
import { inject } from '../helpers';

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

export function injectIlingo(app?: App) : Ilingo {
    const instance = inject<Ilingo>(IlingoSymbol, app);
    if (!instance) {
        throw new Error('An ilingo instance is not present in the vue context.');
    }

    return instance;
}

export function injectIlingoSafe(app?: App) : Ilingo | undefined {
    return inject<Ilingo>(IlingoSymbol, app);
}
