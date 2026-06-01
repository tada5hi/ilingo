/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { isObject } from 'smob';
import type {
    CatalogNode,
    LocaleNode,
    NamespaceNode,
    PluralCategory,
    PluralForms,
    PluralNode,
    TranslationsNode,
} from '../types';

const PLURAL_CATEGORIES = new Set<PluralCategory>([
    'zero',
    'one',
    'two',
    'few',
    'many',
    'other',
]);

/**
 * Validates the inner CLDR-categorised options carried by a plural node
 * — a `{ one, other, ... }` object whose keys are CLDR categories and
 * whose values are strings, with `other` always present. Used by
 * `isPluralNode` to check the `data` of a `{ type: 'plural' }` node.
 */
export function isPluralForms(value: unknown): value is PluralForms {
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
 * Detects a plural leaf — the tagged `{ type: 'plural', data: PluralForms }`
 * node. The `type` discriminator disambiguates a plural from a regular
 * nested translations object whose keys happen to be CLDR-category names.
 */
export function isPluralNode(value: unknown): value is PluralNode {
    return isObject(value) &&
        (value as { type?: unknown }).type === 'plural' &&
        isPluralForms((value as { data?: unknown }).data);
}

/** Detects a `{ type: 'translations', data }` node. */
export function isTranslationsNode(value: unknown): value is TranslationsNode {
    return isObject(value) &&
        (value as { type?: unknown }).type === 'translations' &&
        isObject((value as { data?: unknown }).data);
}

/** Detects a `{ type: 'namespace', name, data }` node. */
export function isNamespaceNode(value: unknown): value is NamespaceNode {
    return isObject(value) &&
        (value as { type?: unknown }).type === 'namespace' &&
        typeof (value as { name?: unknown }).name === 'string' &&
        Array.isArray((value as { data?: unknown }).data);
}

/** Detects a `{ type: 'locale', name, data }` node. */
export function isLocaleNode(value: unknown): value is LocaleNode {
    return isObject(value) &&
        (value as { type?: unknown }).type === 'locale' &&
        typeof (value as { name?: unknown }).name === 'string' &&
        Array.isArray((value as { data?: unknown }).data);
}

/** Detects a `{ type: 'catalog', data }` root node. */
export function isCatalogNode(value: unknown): value is CatalogNode {
    return isObject(value) &&
        (value as { type?: unknown }).type === 'catalog' &&
        Array.isArray((value as { data?: unknown }).data);
}
