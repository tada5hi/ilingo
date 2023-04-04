/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Config, ConfigInput } from './type';
import { buildConfig } from './utils';

let instance : Config | undefined;

export function useConfig() : Config {
    if (typeof instance !== 'undefined') {
        return instance;
    }

    instance = buildConfig();

    return instance;
}

export function setConfig(config: ConfigInput) {
    instance = buildConfig(config);
}

export function hasConfig() {
    return typeof instance !== 'undefined';
}

export function unsetConfig() {
    instance = undefined;
}
