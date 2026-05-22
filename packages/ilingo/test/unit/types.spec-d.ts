/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expectTypeOf, it } from 'vitest';
import {
    Ilingo, MemoryStore, defineCatalog, definePlural,
} from '../../src';

// A typical typed catalog mixing flat keys, nested namespaces, and both
// plural forms (structural + explicit).
const catalog = defineCatalog({
    en: {
        app: {
            greeting: 'Hi {{name}}',
            farewell: 'Bye',
            nested: {
                deep: {
                    leaf: 'Deep value',
                },
            },
        },
        cart: {
            // Explicit plural form — recommended.
            items: {
                '@plural': {
                    one: '{{count}} item',
                    other: '{{count}} items',
                },
            },
            // Structural plural form — backward compat.
            shipping: {
                one: 'One package',
                other: '{{count}} packages',
            },
        },
    },
    de: {
        app: {
            greeting: 'Hallo {{name}}',
            farewell: 'Tschüss',
            nested: {
                deep: {
                    leaf: 'Tiefer Wert',
                },
            },
        },
        cart: {
            items: {
                '@plural': {
                    one: '{{count}} Artikel',
                    other: '{{count}} Artikel',
                },
            },
            shipping: {
                one: 'Ein Paket',
                other: '{{count}} Pakete',
            },
        },
    },
});

type Catalog = typeof catalog;

describe('Ilingo<Catalog> — typed key inference', () => {
    const ilingo = new Ilingo<Catalog>({
        store: new MemoryStore({ data: catalog }),
    });

    it('accepts a flat group/key pair', () => {
        expectTypeOf(
            ilingo.get({ group: 'app', key: 'greeting' }),
        ).resolves.toEqualTypeOf<string | undefined>();
    });

    it('accepts a dotted nested key', () => {
        expectTypeOf(
            ilingo.get({ group: 'app', key: 'nested.deep.leaf' }),
        ).resolves.toEqualTypeOf<string | undefined>();
    });

    it('rejects an unknown group at compile time', () => {
        ilingo.get({
            // @ts-expect-error 'unknown' is not a valid group
            group: 'unknown',
            key: 'greeting',
        });
    });

    it('rejects an unknown key within a known group', () => {
        ilingo.get({
            group: 'app',
            // @ts-expect-error 'unknown' is not a key of the `app` group
            key: 'unknown',
        });
    });

    it('rejects a half-correct dotted key', () => {
        ilingo.get({
            group: 'app',
            // @ts-expect-error 'nested.unknown' is not a key
            key: 'nested.unknown',
        });
    });

    it('rejects an intermediate namespace key (not a leaf)', () => {
        // Regression for PR #915 review: DottedPaths previously included
        // intermediate `K` (the namespace itself) alongside `K.path`.
        // The runtime would have returned undefined for that path; rejecting
        // it at the type level matches the actual contract.
        ilingo.get({
            group: 'app',
            // @ts-expect-error 'nested' is a namespace, not a leaf
            key: 'nested',
        });
        ilingo.get({
            group: 'app',
            // @ts-expect-error 'nested.deep' is also a namespace, not a leaf
            key: 'nested.deep',
        });
    });

    it('requires `count` for an explicit @plural leaf', () => {
        // OK with count.
        ilingo.get({ group: 'cart', key: 'items', count: 1 });

        // @ts-expect-error count is required for plural keys
        ilingo.get({ group: 'cart', key: 'items' });
    });

    it('requires `count` for a structural plural leaf', () => {
        ilingo.get({ group: 'cart', key: 'shipping', count: 2 });

        // @ts-expect-error count is required for plural keys
        ilingo.get({ group: 'cart', key: 'shipping' });
    });

    it('does not require count for a regular string leaf', () => {
        // No count needed when leaf is plain string.
        ilingo.get({ group: 'app', key: 'greeting' });
    });

    it('requires count when locales diverge and at least one is plural', () => {
        // Regression for PR #915 review: a naked
        // `extends PluralLeaf | PluralLeafExplicit` returns false for
        // unions like `string | PluralLeaf`, letting count slip through as
        // optional even when one locale needs plural selection. The
        // `Extract<...>`-based IsPluralKey treats the key as plural when
        // any branch in the union is plural-shaped.
        const divergeCatalog = defineCatalog({
            en: {
                app: {
                    items: {
                        '@plural': { one: '1 item', other: '{{count}} items' },
                    },
                },
            },
            de: {
                app: {
                    // String in German — diverges from English's plural form.
                    items: 'Artikel',
                },
            },
        });

        const il = new Ilingo<typeof divergeCatalog>({
            store: new MemoryStore({ data: divergeCatalog }),
        });

        // OK: count provided.
        il.get({ group: 'app', key: 'items', count: 1 });

        // @ts-expect-error count is required because en defines a plural shape
        il.get({ group: 'app', key: 'items' });
    });
});

describe('Ilingo — no generic preserves backward compat (loose typing)', () => {
    const ilingo = new Ilingo();

    it('accepts arbitrary string groups + keys when no catalog is supplied', () => {
        // Without a generic, the API is intentionally loose.
        ilingo.get({ group: 'whatever', key: 'really.anything' });
        ilingo.get({ group: 'whatever', key: 'really.anything', count: 5 });
    });
});

describe('definePlural — TS/JS authoring helper', () => {
    it('produces the same { "@plural": ... } shape as a literal', () => {
        const a = definePlural({ one: '1 item', other: '{{count}} items' });

        expectTypeOf(a).toMatchTypeOf<{ '@plural': { other: string } }>();
        // The inner CLDR-categorised shape is preserved.
        expectTypeOf(a['@plural'].one).toEqualTypeOf<'1 item'>();
        expectTypeOf(a['@plural'].other).toEqualTypeOf<'{{count}} items'>();
    });

    it('requires `other` and rejects non-CLDR keys at compile time', () => {
        // @ts-expect-error `other` is required by PluralLeaf
        definePlural({ one: 'a' });

        // @ts-expect-error 'foo' is not a CLDR plural category
        definePlural({ other: 'a', foo: 'b' });
    });

    it('a catalog leaf written via definePlural is detected as plural', () => {
        const cat = defineCatalog({
            en: {
                cart: {
                    items: definePlural({ one: '1', other: '{{count}}' }),
                },
            },
        });

        const ilingo = new Ilingo<typeof cat>({
            store: new MemoryStore({ data: cat }),
        });

        // count is required because the leaf is plural-shaped
        ilingo.get({ group: 'cart', key: 'items', count: 2 });

        // @ts-expect-error count is required for plural keys
        ilingo.get({ group: 'cart', key: 'items' });
    });
});

describe('defineCatalog — preserves narrow inference', () => {
    it('keeps per-key literal types instead of widening to string', () => {
        const c = defineCatalog({
            en: { app: { greeting: 'Hi' } },
        });

        // `defineCatalog` carries a `const` generic — keys stay literal,
        // not widened to plain `string`. We assert by reaching for a
        // specific key path that would otherwise be `string` typed.
        expectTypeOf<keyof typeof c>().toEqualTypeOf<'en'>();
        expectTypeOf<keyof (typeof c)['en']>().toEqualTypeOf<'app'>();
        expectTypeOf<keyof (typeof c)['en']['app']>().toEqualTypeOf<'greeting'>();
    });
});
