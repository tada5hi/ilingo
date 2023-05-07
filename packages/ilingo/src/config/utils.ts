/*
 * Copyright (c) 2023-2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { LOCALE_DEFAULT } from '../constants';
import { MemoryStore } from '../store';
import type { Config, ConfigInput } from './type';

export function buildConfig(input?: ConfigInput) : Config {
    input = input || {};

    return {
        locale: input.locale || LOCALE_DEFAULT,
        data: input.data || {},
        store: input.store || new MemoryStore(),
    };
}
