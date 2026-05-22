/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { isObject } from 'smob';
import type { LinesRecord, PluralCategory, PluralLeaf } from '../types';

const PLURAL_CATEGORIES = new Set<PluralCategory>([
    'zero', 
    'one', 
    'two', 
    'few', 
    'many', 
    'other',
]);

export function isPluralLeaf(value: unknown): value is PluralLeaf {
    if (!isObject(value)) {
        return false;
    }
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj);
    if (keys.length === 0 || typeof obj.other !== 'string') {
        return false;
    }
    for (const key of keys) {
        if (!PLURAL_CATEGORIES.has(key as PluralCategory)) {
            return false;
        }
        if (typeof obj[key] !== 'string') {
            return false;
        }
    }
    return true;
}

export function isLineRecord(value: unknown): value is LinesRecord {
    if (!isObject(value)) {
        return false;
    }

    if (isPluralLeaf(value)) {
        return false;
    }

    const ob = value as Record<string, any>;
    const keys = Object.keys(ob);
    for (const key of keys) {
        /* istanbul ignore next */
        if (
            typeof ob[key] !== 'string' &&
            !isPluralLeaf(ob[key]) &&
            !isLineRecord(ob[key])
        ) {
            return false;
        }
    }

    return true;
}
