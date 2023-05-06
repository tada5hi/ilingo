/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { merge } from 'smob';
import type { LinesRecord } from '../type';

export function flattenLinesRecord(input: LinesRecord, prefix = '') {
    const output : Record<string, string> = {};

    const keys = Object.keys(input);
    for (let i = 0; i < keys.length; i++) {
        const value = input[keys[i]];
        if (typeof value === 'string') {
            if (prefix) {
                output[`${prefix}.${keys[i]}`] = value;
            } else {
                output[keys[i]] = value;
            }
        } else {
            merge(output, flattenLinesRecord(value, prefix ? `${prefix}.${keys[i]}` : keys[i]));
        }
    }

    return output;
}
