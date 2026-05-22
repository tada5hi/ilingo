/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { isObject } from 'smob';
import type { 
    LinesRecord, 
    PluralCategory, 
    PluralLeaf, 
    PluralLeafExplicit, 
} from '../types';

export const PLURAL_MARKER = '@plural';

const PLURAL_CATEGORIES = new Set<PluralCategory>([
    'zero',
    'one',
    'two',
    'few',
    'many',
    'other',
]);

/**
 * Detects a bare `{ one, other, ... }` plural object by structure. Returns
 * `true` only when every key is a CLDR category and `other` is present.
 */
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

/**
 * Detects an explicit `{ "@plural": { ... } }` wrapper. Recommended form —
 * unambiguous regardless of sibling key names.
 */
export function isPluralLeafExplicit(value: unknown): value is PluralLeafExplicit {
    if (!isObject(value)) {
        return false;
    }
    const obj = value as Record<string, unknown>;
    return PLURAL_MARKER in obj && isPluralLeaf(obj[PLURAL_MARKER]);
}

/**
 * Unwrap either plural form (explicit or structural) into the inner
 * `PluralLeaf`. Returns `undefined` for non-plural values.
 */
export function asPluralLeaf(value: unknown): PluralLeaf | undefined {
    if (isPluralLeafExplicit(value)) {
        return value[PLURAL_MARKER];
    }
    if (isPluralLeaf(value)) {
        return value;
    }
    return undefined;
}

export function isLineRecord(value: unknown): value is LinesRecord {
    if (!isObject(value)) {
        return false;
    }

    if (isPluralLeaf(value) || isPluralLeafExplicit(value)) {
        return false;
    }

    const ob = value as Record<string, any>;
    const keys = Object.keys(ob);
    for (const key of keys) {
        /* istanbul ignore next */
        if (
            typeof ob[key] !== 'string' &&
            !isPluralLeaf(ob[key]) &&
            !isPluralLeafExplicit(ob[key]) &&
            !isLineRecord(ob[key])
        ) {
            return false;
        }
    }

    return true;
}
