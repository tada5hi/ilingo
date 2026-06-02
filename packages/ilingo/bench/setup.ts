/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import i18next from 'i18next';
import {
    Ilingo,
    MemoryStore,
    defineCatalog,
    defineLocale,
    defineNamespace,
    definePlural,
    defineTranslations,
    isPluralNode,
    normalizeCatalog,
} from '../src';
import type { CatalogNode, Translations } from '../src';

/**
 * Shared synthetic catalog for both contenders, authored as a descriptor
 * tree. ~30 keys per locale, two namespaces, mixed shapes (strings, nested
 * keys, a plural leaf). Sized to fit a realistic small-to-medium app
 * section — large enough to make dotted-path lookups meaningful, small
 * enough that variance from cache effects doesn't drown out the signal.
 */
export const catalog: CatalogNode = defineCatalog([
    defineLocale('en', [
        defineNamespace('app', [
            defineTranslations({
                greeting: 'Hi {{name}}',
                farewell: 'Bye, see you on {{day}}',
                nested: { deep: { leaf: 'Deep value' } },
                cart: {
                    items: definePlural({
                        one: '{{count}} item',
                        other: '{{count}} items',
                    }),
                    total: 'Total: {{amount, number(currency=EUR)}}',
                },
                misc1: 'a',
                misc2: 'b',
                misc3: 'c',
                misc4: 'd',
                misc5: 'e',
                misc6: 'f',
                misc7: 'g',
                misc8: 'h',
                misc9: 'i',
                misc10: 'j',
            }),
        ]),
        defineNamespace('form', [
            defineTranslations({
                submit: 'Submit',
                cancel: 'Cancel',
                field1: 'one',
                field2: 'two',
                field3: 'three',
                field4: 'four',
                field5: 'five',
            }),
        ]),
    ]),
    defineLocale('de', [
        defineNamespace('app', [
            defineTranslations({
                greeting: 'Hallo {{name}}',
                farewell: 'Tschüss, bis {{day}}',
                nested: { deep: { leaf: 'Tiefer Wert' } },
                cart: {
                    items: definePlural({
                        one: '{{count}} Artikel',
                        other: '{{count}} Artikel',
                    }),
                    total: 'Gesamt: {{amount, number(currency=EUR)}}',
                },
                misc1: 'a',
                misc2: 'b',
                misc3: 'c',
                misc4: 'd',
                misc5: 'e',
                misc6: 'f',
                misc7: 'g',
                misc8: 'h',
                misc9: 'i',
                misc10: 'j',
            }),
        ]),
        defineNamespace('form', [
            defineTranslations({
                submit: 'Senden',
                cancel: 'Abbrechen',
                field1: 'eins',
                field2: 'zwei',
                field3: 'drei',
                field4: 'vier',
                field5: 'fünf',
            }),
        ]),
    ]),
]);

/**
 * Pre-built ilingo instance (cached, single locale 'en').
 */
export function makeIlingo() {
    return new Ilingo({
        store: new MemoryStore({ data: catalog }),
        locale: 'en',
    });
}

/**
 * Pre-built i18next instance configured to match ilingo's behaviour as
 * closely as possible: same catalog flattened to i18next's shape, same
 * fallback chain (en), interpolation enabled, plural handling on.
 *
 * i18next groups its catalog under namespaces — we reuse our two
 * namespaces (`app`, `form`) so its `t('app:greeting')` call matches our
 * `get({ namespace: 'app', key: 'greeting' })`. Resources are derived from
 * the same descriptor tree via `normalizeCatalog`, so both contenders do
 * the same work. Plurals use i18next's native suffix convention
 * (`items_one` / `items_other`) because that's the equivalent contract on
 * their side.
 */
export function makeI18next() {
    const normalized = normalizeCatalog(catalog);
    const instance = i18next.createInstance();
    instance.init({
        lng: 'en',
        fallbackLng: 'en',
        ns: ['app', 'form'],
        defaultNS: 'app',
        // i18next requires explicit resource shape per namespace.
        resources: {
            en: {
                app: flatten(normalized.en.app),
                form: flatten(normalized.en.form),
            },
            de: {
                app: flatten(normalized.de.app),
                form: flatten(normalized.de.form),
            },
        },
        // Match ilingo: synchronous init, no async I/O during t().
        initImmediate: false,
        interpolation: {
            escapeValue: false,
            // i18next's default `{{var}}` syntax already matches ilingo.
        },
    });
    return instance;
}

/**
 * Flatten ilingo's normalized nested-key namespace into i18next's flat-key
 * + suffix shape: a plural leaf at `cart.items` becomes `cart.items_one` /
 * `cart.items_other`, nested keys stay dotted, plain strings pass through.
 */
function flatten(translations: Translations): Record<string, string> {
    const out: Record<string, string> = {};
    const walk = (obj: Translations, prefix: string) => {
        for (const [k, v] of Object.entries(obj)) {
            const next = prefix ? `${prefix}.${k}` : k;
            if (typeof v === 'string') {
                out[next] = v;
            } else if (isPluralNode(v)) {
                // i18next plural suffix convention
                for (const [cat, str] of Object.entries(v.data)) {
                    out[`${next}_${cat}`] = str as string;
                }
            } else {
                walk(v as Translations, next);
            }
        }
    };
    walk(translations, '');
    return out;
}
