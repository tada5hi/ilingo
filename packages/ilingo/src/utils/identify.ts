/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { isObject } from 'smob';
import type { LinesRecord } from '../types';

export function isLineRecord(value: unknown) : value is LinesRecord {
    if (!isObject(value)) {
        return false;
    }

    const ob = value as Record<string, any>;
    const keys = Object.keys(ob);
    for (const key of keys) {
        /* istanbul ignore next */
        if (
            typeof ob[key] !== 'string' &&
            !isLineRecord(ob[key])
        ) {
            return false;
        }
    }

    return true;
}
