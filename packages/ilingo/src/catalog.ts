/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    CatalogNode,
    Lines,
    LinesNode,
    LocaleNode,
    NamespaceChild,
    NamespaceNode,
    PluralForms,
    PluralNode,
} from './types';

/**
 * A terminal group of translations for the surrounding namespace. The data
 * is a flat or key-nested map of `string | PluralNode` leaves — a nested
 * object extends the dotted *key* path (`{ nav: { home } }` → `nav.home`).
 *
 * @example
 *     defineLines({
 *         greeting: 'Hi {{name}}',
 *         nav: { home: 'Home', settings: 'Settings' }, // → nav.home, nav.settings
 *     });
 */
export function defineLines(data: Lines): LinesNode {
    return { type: 'lines', data };
}

/**
 * A namespace. Its children are sub-namespaces and/or lines groups — a
 * nested `defineNamespace` extends the dotted *namespace* path
 * (`app` ▸ `nav` → namespace `app.nav`), while lines inside it populate the
 * namespace's keys.
 *
 * @example
 *     defineNamespace('app', [
 *         defineLines({ greeting: 'Hi {{name}}' }),
 *         defineNamespace('nav', [ defineLines({ home: 'Home' }) ]), // → app.nav
 *     ]);
 */
export function defineNamespace(name: string, data: NamespaceChild[]): NamespaceNode {
    return {
        type: 'namespace', 
        name, 
        data, 
    };
}

/**
 * One locale's content — a list of namespaces (and, reserved for the future
 * default-namespace feature, bare lines groups). Compose locales into a
 * catalog with `defineCatalog`.
 *
 * @example
 *     // locales/en.ts
 *     import { defineLocale, defineNamespace, defineLines, definePlural } from 'ilingo';
 *
 *     export default defineLocale('en', [
 *         defineNamespace('app', [ defineLines({ greeting: 'Hi {{name}}' }) ]),
 *         defineNamespace('cart', [
 *             defineLines({ items: definePlural({ one: '1 item', other: '{{count}} items' }) }),
 *         ]),
 *     ]);
 */
export function defineLocale(name: string, data: NamespaceChild[]): LocaleNode {
    return {
        type: 'locale', 
        name, 
        data, 
    };
}

/**
 * Root of a catalog tree — a list of locales. The result is the canonical
 * ingestion format consumed by `MemoryStore({ data })` (and reduced to the
 * internal lookup shape by `normalizeCatalog`).
 *
 * @example
 *     import { defineCatalog } from 'ilingo';
 *     import en from './locales/en';
 *     import de from './locales/de';
 *
 *     export const catalog = defineCatalog([en, de]);
 *     const ilingo = new Ilingo({ store: new MemoryStore({ data: catalog }) });
 */
export function defineCatalog(data: LocaleNode[]): CatalogNode {
    return { type: 'catalog', data };
}

/**
 * A plural leaf. Wraps the CLDR-categorised forms into the tagged
 * `{ type: 'plural', data }` node — the only recognised plural form. The
 * `PluralForms` parameter requires `other` and restricts the keys to CLDR
 * categories, so a missing `other` or a misspelled category is a compile
 * error and the categories autocomplete.
 *
 * JSON files cannot call functions, so they write the literal
 * `{ "type": "plural", "data": { "one": "...", "other": "..." } }` instead.
 *
 * @example
 *     defineLines({
 *         items: definePlural({ one: '{{count}} item', other: '{{count}} items' }),
 *     });
 */
export function definePlural(data: PluralForms): PluralNode {
    return { type: 'plural', data };
}
