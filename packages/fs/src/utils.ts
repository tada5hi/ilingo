/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { normalize } from 'pathe';
import process from 'node:process';
import type { Config, ConfigInput } from './types';

export function buildConfig(input?: ConfigInput) : Config {
    input = input || {};

    let directory : string[];
    if (input.directory) {
        directory = Array.isArray(input.directory) ?
            input.directory :
            [input.directory];

        for (let i = 0; i < directory.length; i++) {
            directory[i] = normalize(directory[i]);
        }
    } else {
        directory = [process.cwd()];
    }

    return {
        directory,
    };
}
