/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { hasOwnProperty, isObject } from 'smob';
import type { GroupContext, LinesRecord, LocaleContext } from '../type';

export function isLineRecord(value: unknown) : value is LinesRecord {
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

export function isLocaleContext(input: unknown) : input is LocaleContext {
    return isObject(input) &&
        hasOwnProperty(input, 'locale');
}

export function isGroupContext(input: unknown) : input is GroupContext {
    return isObject(input) &&
        hasOwnProperty(input, 'group');
}
