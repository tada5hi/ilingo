/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Options } from '@ilingo/vue';
import { applyInstallInput } from '@ilingo/vue';
import type { IIlingo } from 'ilingo';
import type { App, Plugin } from 'vue';
import { register } from './store';

export function install(
    app: App,
    input?: Options | IIlingo,
) : void {
    const instance = applyInstallInput(app, input);
    register(instance);
}

export default { install } satisfies Plugin<Options | IIlingo | undefined>;

export * from './component';
export * from './composables';
export * from './helpers';
export * from './store';
export * from './types';
