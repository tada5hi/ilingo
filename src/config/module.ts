/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Config, ConfigInput } from './type';
import { buildConfig } from './utils';

const instances : Record<string, Config> = {};

export function useConfig(alias?: string) : Config {
    alias = alias || 'default';

    if (Object.prototype.hasOwnProperty.call(instances, alias)) {
        return instances[alias];
    }

    instances[alias] = buildConfig();

    return instances[alias];
}

export function setConfig(config: ConfigInput, alias?: string) {
    instances[alias || 'default'] = buildConfig(config);
}

export function hasConfig(alias?: string) {
    return Object.prototype.hasOwnProperty.call(instances, alias || 'default');
}
