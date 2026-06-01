/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    defineCatalog,
    defineTranslations,
    defineLocale,
    defineNamespace,
    definePlural,
} from 'ilingo';
import type { CatalogNode, Translations, PluralForms, PluralNode } from 'ilingo';

type PluralMarker = { '@plural': PluralForms };
type PlainValue = string | PluralMarker | PluralNode | PlainLines;
type PlainLines = { [key: string]: PlainValue };
type PlainCatalog = { [locale: string]: { [namespace: string]: PlainLines } };

function isPluralMarker(value: object): value is PluralMarker {
    return '@plural' in value;
}

function isPluralNodeValue(value: object): value is PluralNode {
    return (value as { type?: unknown }).type === 'plural';
}

function toLines(plain: PlainLines): Translations {
    const out: Translations = {};
    for (const [key, value] of Object.entries(plain)) {
        if (typeof value === 'string') {
            out[key] = value;
        } else if (isPluralNodeValue(value)) {
            out[key] = value;
        } else if (isPluralMarker(value)) {
            out[key] = definePlural(value['@plural']);
        } else {
            out[key] = toLines(value);
        }
    }
    return out;
}

/**
 * Build a catalog tree from the legacy `{ locale: { namespace: translations } }`
 * shape — keeps the Vue component/composable tests concise.
 */
export function toCatalog(plain: PlainCatalog): CatalogNode {
    return defineCatalog(
        Object.entries(plain).map(([locale, namespaces]) => defineLocale(
            locale,
            Object.entries(namespaces).map(([namespace, translations]) => defineNamespace(
                namespace,
                [defineTranslations(toLines(translations))],
            )),
        )),
    );
}
