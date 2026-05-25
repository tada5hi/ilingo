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
 * Validates the inner shape of a plural leaf — a `{ one, other, ... }`
 * object whose keys are CLDR categories and whose values are strings,
 * with `other` always present. Used by `isPluralLeafExplicit` to check
 * the contents of the `@plural` wrapper.
 *
 * Not a top-level plural detector: a bare object of this shape sitting
 * directly under a group is treated as a regular nested namespace.
 * Wrap it in `{ "@plural": { ... } }` (JSON) or `definePlural({ ... })`
 * (TS) to mark it as a plural leaf.
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
 * Detects the `{ "@plural": { ... } }` wrapper — the only recognised
 * plural form. The marker disambiguates plurals from regular namespaces
 * that happen to use CLDR-category key names.
 */
export function isPluralLeafExplicit(value: unknown): value is PluralLeafExplicit {
    if (!isObject(value)) {
        return false;
    }
    const obj = value as Record<string, unknown>;
    return PLURAL_MARKER in obj && isPluralLeaf(obj[PLURAL_MARKER]);
}

export function isLineRecord(value: unknown): value is LinesRecord {
    if (!isObject(value)) {
        return false;
    }

    if (isPluralLeafExplicit(value)) {
        return false;
    }

    const ob = value as Record<string, any>;
    const keys = Object.keys(ob);
    for (const key of keys) {
        /* istanbul ignore next */
        if (
            typeof ob[key] !== 'string' &&
            !isPluralLeafExplicit(ob[key]) &&
            !isLineRecord(ob[key])
        ) {
            return false;
        }
    }

    return true;
}
