/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Data } from 'ilingo';
import { unref } from 'vue';
import type { DataMaybeRef } from '../types';

export function extractReactiveData(input: DataMaybeRef) : Data {
    const output : Data = {};
    const keys = Object.keys(input);
    for (let i = 0; i < keys.length; i++) {
        output[keys[i]] = unref(input[keys[i]]);
    }

    return output;
}
