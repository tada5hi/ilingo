/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Options } from '@ilingo/vue';
import { applyInstallInput, provideIlingo } from '@ilingo/vue';
import type { Ilingo } from 'ilingo';
import type { App, Plugin } from 'vue';
import { Store, createStore } from './store';

export function install(
    app: App,
    input?: Options | Ilingo,
) : void {
    const instance = applyInstallInput(app, input);
    const stores = instance.stores.values();
    let found = false;
    while (true) {
        const storeIterator = stores.next();
        if (storeIterator.done) {
            break;
        }

        if (storeIterator.value instanceof Store) {
            found = true;
            break;
        }
    }

    if (!found) {
        instance.stores.add(createStore());
    }

    provideIlingo(instance, app);
}

export default {
    install,
} satisfies Plugin<Options | Ilingo | undefined>;

export * from './component';
export * from './composables';
export * from './helpers';
export * from './types';
