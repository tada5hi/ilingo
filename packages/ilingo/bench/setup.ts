/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import i18next from 'i18next';
import { Ilingo, MemoryStore } from '../src';

/**
 * Shared synthetic catalog for both contenders. ~30 keys per locale, two
 * groups, mixed shapes (strings, nested namespaces, a plural leaf). Sized
 * to fit a realistic small-to-medium app section — large enough to make
 * dotted-path lookups meaningful, small enough that variance from cache
 * effects doesn't drown out the signal.
 */
export const catalog = {
    en: {
        app: {
            greeting: 'Hi {{name}}',
            farewell: 'Bye, see you on {{day}}',
            nested: { deep: { leaf: 'Deep value' } },
            cart: {
                items: {
                    '@plural': {
                        one: '{{count}} item',
                        other: '{{count}} items',
                    },
                },
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
        },
        form: {
            submit: 'Submit',
            cancel: 'Cancel',
            field1: 'one',
            field2: 'two',
            field3: 'three',
            field4: 'four',
            field5: 'five',
        },
    },
    de: {
        app: {
            greeting: 'Hallo {{name}}',
            farewell: 'Tschüss, bis {{day}}',
            nested: { deep: { leaf: 'Tiefer Wert' } },
            cart: {
                items: {
                    '@plural': {
                        one: '{{count}} Artikel',
                        other: '{{count}} Artikel',
                    },
                },
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
        },
        form: {
            submit: 'Senden',
            cancel: 'Abbrechen',
            field1: 'eins',
            field2: 'zwei',
            field3: 'drei',
            field4: 'vier',
            field5: 'fünf',
        },
    },
} as const;

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
 * i18next groups its catalog under namespaces — we flatten our two
 * groups (`app`, `form`) into namespaces so its `t('app:greeting')`
 * call matches our `get({ namespace: 'app', key: 'greeting' })`. Plurals
 * use i18next's native suffix convention (`items_one` / `items_other`)
 * because that's the equivalent contract on their side.
 */
export function makeI18next() {
    const instance = i18next.createInstance();
    instance.init({
        lng: 'en',
        fallbackLng: 'en',
        ns: ['app', 'form'],
        defaultNS: 'app',
        // i18next requires explicit resource shape per namespace.
        resources: {
            en: {
                app: flatten(catalog.en.app),
                form: catalog.en.form,
            },
            de: {
                app: flatten(catalog.de.app),
                form: catalog.de.form,
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
 * Flatten ilingo's nested-object catalog into i18next's flat-key + suffix
 * shape: `cart.items.@plural.one` becomes `cart.items_one`, nested keys
 * stay dotted, plain strings pass through.
 */
function flatten(namespace: Record<string, unknown>): Record<string, string> {
    const out: Record<string, string> = {};
    const walk = (obj: Record<string, unknown>, prefix: string) => {
        for (const [k, v] of Object.entries(obj)) {
            const next = prefix ? `${prefix}.${k}` : k;
            if (typeof v === 'string') {
                out[next] = v;
            } else if (v && typeof v === 'object' && '@plural' in v) {
                const forms = (v as { '@plural': Record<string, string> })['@plural'];
                // i18next plural suffix convention
                for (const [cat, str] of Object.entries(forms)) {
                    out[`${next}_${cat}`] = str;
                }
            } else if (v && typeof v === 'object') {
                walk(v as Record<string, unknown>, next);
            }
        }
    };
    walk(namespace, '');
    return out;
}
