/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { isObject } from 'smob';
import type { Lines } from '../type';

export function isLineRecord(value: unknown) : value is Lines {
    if (!isObject(value)) {
        return false;
    }

    const ob = value as Record<string, any>;
    const keys = Object.keys(ob);
    for (let i = 0; i < keys.length; i++) {
        /* istanbul ignore next */
        if (
            typeof ob[keys[i]] !== 'string' &&
            !isLineRecord(ob[keys[i]])
        ) {
            return false;
        }
    }

    return true;
}
