/*
 * Copyright (c) 2023-2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Config, ConfigInput } from './type';

export function buildConfig(input?: ConfigInput) : Config {
    input = input || {};

    let directory : string[] = [];
    if (input.directory) {
        directory = Array.isArray(input.directory) ?
            input.directory :
            [input.directory];
    }

    return {
        locale: input.locale || 'en',
        directory,
        data: input.data || {},
    };
}
