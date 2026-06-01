/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Ilingo, MemoryStore, defineCatalog, defineTranslations, defineLocale, defineNamespace, definePlural } from '../../src';
import { toCatalog } from '../helpers/catalog';

describe('Ilingo — resolution path', () => {
    let warn: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    });

    afterEach(() => {
        warn.mockRestore();
    });

    describe('#895 — pluralization', () => {
        const make = () => new Ilingo({
            store: new MemoryStore({
                data: toCatalog({
                    en: {
                        cart: {
                            items: {
                                '@plural': {
                                    one: '{{count}} item',
                                    other: '{{count}} items',
                                },
                            },
                        },
                    },
                    cy: {
                        cart: {
                            items: {
                                '@plural': {
                                    zero: 'dim eitemau',
                                    one: '{{count}} eitem',
                                    two: '{{count}} eitem',
                                    few: '{{count}} eitem',
                                    many: '{{count}} eitem',
                                    other: '{{count}} eitem',
                                },
                            },
                        },
                    },
                }),
            }),
        });

        it('selects "one" for count === 1', async () => {
            expect(
                await make().get({ namespace: 'cart', key: 'items', count: 1 }),
            ).toEqual('1 item');
        });

        it('selects "other" for count === 0 in English', async () => {
            expect(
                await make().get({ namespace: 'cart', key: 'items', count: 0 }),
            ).toEqual('0 items');
        });

        it('selects "zero" in Welsh', async () => {
            expect(
                await make().get({
                    namespace: 'cart', key: 'items', count: 0, locale: 'cy',
                }),
            ).toEqual('dim eitemau');
        });

        it('falls back to "other" if the selected category is absent', async () => {
            const ilingo = new Ilingo({
                store: new MemoryStore({
                    data: toCatalog({ en: { cart: { items: { '@plural': { other: '{{count}} items' } } } } }),
                }),
            });
            expect(
                await ilingo.get({ namespace: 'cart', key: 'items', count: 1 }),
            ).toEqual('1 items');
        });

        it('returns the plain string when count is omitted on a plural leaf', async () => {
            // Documented behaviour: without count, default to `other`.
            expect(
                await make().get({ namespace: 'cart', key: 'items' }),
            ).toEqual('{{count}} items');
        });

        it('count merges into data without overriding an explicit value', async () => {
            const ilingo = new Ilingo({
                store: new MemoryStore({
                    data: toCatalog({
                        en: {
                            cart: {
                                items: {
                                    '@plural': {
                                        one: '{{count}} of {{total}}',
                                        other: '{{count}} of {{total}}',
                                    },
                                },
                            },
                        },
                    }),
                }),
            });
            expect(
                await ilingo.get({
                    namespace: 'cart',
                    key: 'items',
                    count: 3,
                    data: { total: 99 },
                }),
            ).toEqual('3 of 99');
        });
    });

    describe('#897 — fallback locale chain', () => {
        it('derives BCP-47 parents by default', async () => {
            const ilingo = new Ilingo({
                store: new MemoryStore({
                    data: toCatalog({
                        pt: { app: { hi: 'olá pt' } },
                        'pt-BR': { app: {} },
                    }),
                }),
                locale: 'pt-BR',
            });
            expect(await ilingo.get({ namespace: 'app', key: 'hi' })).toEqual('olá pt');
        });

        it('falls all the way to LOCALE_DEFAULT', async () => {
            const ilingo = new Ilingo({
                store: new MemoryStore({
                    data: toCatalog({ en: { app: { hi: 'hello' } } }),
                }),
                locale: 'pt-BR',
            });
            expect(await ilingo.get({ namespace: 'app', key: 'hi' })).toEqual('hello');
        });

        it('respects an explicit string fallback', async () => {
            const ilingo = new Ilingo({
                store: new MemoryStore({
                    data: toCatalog({ es: { app: { hi: 'hola' } } }),
                }),
                locale: 'pt-BR',
                fallback: 'es',
            });
            expect(await ilingo.get({ namespace: 'app', key: 'hi' })).toEqual('hola');
        });

        it('respects an explicit fallback array, in order', async () => {
            const ilingo = new Ilingo({
                store: new MemoryStore({
                    data: toCatalog({
                        fr: { app: { hi: 'salut' } },
                        es: { app: { hi: 'hola' } },
                    }),
                }),
                locale: 'pt-BR',
                fallback: ['es', 'fr'],
            });
            expect(await ilingo.get({ namespace: 'app', key: 'hi' })).toEqual('hola');
        });

        it('respects a fallback resolver function', async () => {
            const ilingo = new Ilingo({
                store: new MemoryStore({
                    data: toCatalog({ fr: { app: { hi: 'salut' } } }),
                }),
                locale: 'pt-BR',
                fallback: (locale) => (locale.startsWith('pt') ? ['fr'] : []),
            });
            expect(await ilingo.get({ namespace: 'app', key: 'hi' })).toEqual('salut');
        });

        it('getResolvedLocale reports which locale yielded the value', async () => {
            const ilingo = new Ilingo({
                store: new MemoryStore({
                    data: toCatalog({
                        pt: { app: { hi: 'olá pt' } },
                    }),
                }),
                locale: 'pt-BR',
            });
            expect(
                await ilingo.getResolvedLocale({ namespace: 'app', key: 'hi' }),
            ).toEqual('pt');
            expect(
                await ilingo.getResolvedLocale({ namespace: 'app', key: 'missing' }),
            ).toBeUndefined();
        });

        it('locale-closeness beats store priority', async () => {
            const ilingo = new Ilingo({
                store: new MemoryStore({
                    data: toCatalog({ en: { app: { hi: 'hello (store1)' } } }),
                }),
                locale: 'pt-BR',
            });
            ilingo.registerStore(new MemoryStore({
                data: toCatalog({ pt: { app: { hi: 'olá (store2)' } } }),
            }));
            expect(await ilingo.get({ namespace: 'app', key: 'hi' })).toEqual('olá (store2)');
        });
    });

    describe('#899 — missing-key handler', () => {
        it('default handler warns once per (locale, namespace, key) and returns undefined', async () => {
            const ilingo = new Ilingo({
                store: new MemoryStore({ data: defineCatalog([]) }),
            });

            expect(await ilingo.get({ namespace: 'app', key: 'nope' })).toBeUndefined();
            expect(await ilingo.get({ namespace: 'app', key: 'nope' })).toBeUndefined();

            expect(warn).toHaveBeenCalledTimes(1);
            expect(warn.mock.calls[0][0]).toContain('app.nope');
        });

        it('custom handler may return a string, which becomes the result', async () => {
            const onMissingKey = vi.fn(() => 'FALLBACK');
            const ilingo = new Ilingo({
                store: new MemoryStore({ data: defineCatalog([]) }),
                onMissingKey,
            });

            expect(await ilingo.get({ namespace: 'app', key: 'nope' })).toEqual('FALLBACK');
            expect(onMissingKey).toHaveBeenCalledWith(
                expect.objectContaining({ namespace: 'app', key: 'nope' }),
            );
        });

        it('handler receives resolvedLocale = last locale in the chain', async () => {
            const onMissingKey = vi.fn(() => undefined);
            const ilingo = new Ilingo({
                store: new MemoryStore({ data: defineCatalog([]) }),
                locale: 'pt-BR',
                onMissingKey,
            });

            await ilingo.get({ namespace: 'app', key: 'nope' });

            expect(onMissingKey).toHaveBeenCalledWith(
                expect.objectContaining({ resolvedLocale: 'en' }),
            );
        });

        it('handler is not called when a hit is found', async () => {
            const onMissingKey = vi.fn();
            const ilingo = new Ilingo({
                store: new MemoryStore({ data: toCatalog({ en: { app: { hi: 'hello' } } }) }),
                onMissingKey,
            });
            await ilingo.get({ namespace: 'app', key: 'hi' });
            expect(onMissingKey).not.toHaveBeenCalled();
        });

        it('warn-once state is per-instance, not shared across Ilingo instances', async () => {
            const a = new Ilingo({ store: new MemoryStore({ data: defineCatalog([]) }) });
            const b = new Ilingo({ store: new MemoryStore({ data: defineCatalog([]) }) });

            await a.get({ namespace: 'app', key: 'isolated' });
            await b.get({ namespace: 'app', key: 'isolated' });

            // Two instances → two warnings for the same key. Without
            // per-instance state, `b` would silently dedupe `a`'s warning.
            expect(warn).toHaveBeenCalledTimes(2);
        });
    });

    describe('plural write side (#912 review)', () => {
        it('MemoryStore.set + get round-trips a plural node', async () => {
            const store = new MemoryStore({ data: defineCatalog([]) });
            await store.set({
                locale: 'en',
                namespace: 'cart',
                key: 'items',
                value: definePlural({ one: '{{count}} item', other: '{{count}} items' }),
            });

            const ilingo = new Ilingo({ store });
            expect(
                await ilingo.get({ namespace: 'cart', key: 'items', count: 1 }),
            ).toEqual('1 item');
            expect(
                await ilingo.get({ namespace: 'cart', key: 'items', count: 7 }),
            ).toEqual('7 items');
        });
    });

    describe('bare nested object — not recognised as plural', () => {
        it('treats { one, other } as a regular nested key group', async () => {
            // Without a `{ type: 'plural' }` node, the object is just a key
            // group whose keys are named "one" / "other". `ilingo.get`
            // returns undefined for the bare key (no string leaf there) — and
            // the missing-key warning fires because the lookup walked past a
            // non-leaf.
            const ilingo = new Ilingo({
                store: new MemoryStore({
                    data: toCatalog({
                        en: {
                            cart: {
                                items: {
                                    one: '{{count}} item',
                                    other: '{{count}} items',
                                },
                            },
                        },
                    }),
                }),
            });

            expect(
                await ilingo.get({ namespace: 'cart', key: 'items', count: 1 }),
            ).toBeUndefined();

            // Inner keys are still reachable via dotted access — useful when
            // a namespace legitimately needs sibling keys named after CLDR
            // categories (e.g. an enum dropdown with an "other" option).
            expect(
                await ilingo.get({ namespace: 'cart', key: 'items.one' }),
            ).toEqual('{{count}} item');
        });
    });

    describe('plural node', () => {
        it('definePlural() produces a recognised plural leaf', async () => {
            const ilingo = new Ilingo({
                store: new MemoryStore({
                    data: defineCatalog([
                        defineLocale('en', [
                            defineNamespace('cart', [
                                defineTranslations({
                                    items: definePlural({
                                        one: '{{count}} item',
                                        other: '{{count}} items',
                                    }),
                                }),
                            ]),
                        ]),
                    ]),
                }),
            });

            expect(await ilingo.get({ namespace: 'cart', key: 'items', count: 1 }))
                .toEqual('1 item');
            expect(await ilingo.get({ namespace: 'cart', key: 'items', count: 5 }))
                .toEqual('5 items');
        });

        it('recognises a literal { type: "plural", data } node (the JSON form)', async () => {
            // JSON files can't call definePlural(), so they author the node
            // literally. The store recognises it the same way.
            const ilingo = new Ilingo({
                store: new MemoryStore({
                    data: toCatalog({
                        en: {
                            cart: {
                                items: {
                                    type: 'plural',
                                    data: {
                                        one: '{{count}} item',
                                        other: '{{count}} items',
                                    },
                                } as never,
                            },
                        },
                    }),
                }),
            });
            expect(
                await ilingo.get({ namespace: 'cart', key: 'items', count: 1 }),
            ).toEqual('1 item');
            expect(
                await ilingo.get({ namespace: 'cart', key: 'items', count: 3 }),
            ).toEqual('3 items');
        });

        it('namespace whose only key happens to be "other" is walked normally', async () => {
            // A plural is a tagged node, so a sibling key called `other`
            // (or `one`, etc.) is just a regular nested key group and is
            // reachable via dotted access.
            const ilingo = new Ilingo({
                store: new MemoryStore({
                    data: toCatalog({
                        en: {
                            form: {
                                kind: {
                                    other: { label: 'Other' },
                                },
                            },
                        },
                    }),
                }),
            });
            expect(
                await ilingo.get({ namespace: 'form', key: 'kind.other.label' }),
            ).toEqual('Other');
        });
    });

    describe('serial-on-miss store walk', () => {
        const makeRecordingStore = (
            entries: { id: number }[],
            id: number,
            hit?: string,
        ) => ({
            // Unique store identity per fake — Ilingo.registerStore keys the
            // store Map by `store.id`, so without a distinct id every fake
            // would collide on one key and overwrite the previous one.
            id: Symbol(`recording-store-${id}`),
            async get(_ctx: { locale: string; namespace: string; key: string }) {
                entries.push({ id });
                return hit;
            },
            async set() { /* noop */ },
            async getLocales() { return []; },
        });

        it('stops at the first hit and never calls later stores', async () => {
            // When the earlier-registered store answers, the later store
            // (think: a network adapter) MUST NOT be touched. That is the
            // whole point of the locale-first, serial composition — a
            // Memory hit should not trigger an HTTP request.
            const entries: { id: number }[] = [];
            const ilingo = new Ilingo({});
            ilingo.registerStore(makeRecordingStore(entries, 1, 'from store 1'));
            ilingo.registerStore(makeRecordingStore(entries, 2, 'from store 2'));

            const result = await ilingo.get({ namespace: 'app', key: 'hi' });

            expect(result).toEqual('from store 1');
            expect(entries.map((e) => e.id)).toEqual([1]);
        });

        it('falls through to later stores when earlier ones miss', async () => {
            const entries: { id: number }[] = [];
            const ilingo = new Ilingo({});
            ilingo.registerStore(makeRecordingStore(entries, 1));
            ilingo.registerStore(makeRecordingStore(entries, 2));
            ilingo.registerStore(makeRecordingStore(entries, 3, 'from store 3'));

            const result = await ilingo.get({ namespace: 'app', key: 'hi' });

            expect(result).toEqual('from store 3');
            expect(entries.map((e) => e.id)).toEqual([1, 2, 3]);
        });

        it('preserves store insertion order on a tie within a locale', async () => {
            const ilingo = new Ilingo({
                store: new MemoryStore({
                    data: toCatalog({ en: { app: { hi: 'from store 1' } } }),
                }),
            });
            ilingo.registerStore(new MemoryStore({
                data: toCatalog({ en: { app: { hi: 'from store 2' } } }),
            }));

            expect(await ilingo.get({ namespace: 'app', key: 'hi' })).toEqual('from store 1');
        });
    });

    describe('Ilingo.clone() — config override semantics', () => {
        it('inherits parent config when overrides are omitted', async () => {
            const parent = new Ilingo({
                store: new MemoryStore({ data: toCatalog({ de: { app: { hi: 'Hallo' } } }) }),
                locale: 'de',
                fallback: 'de',
            });

            const child = parent.clone();

            // pt-BR has no data; parent's `fallback: 'de'` should be inherited
            // so the lookup finds the German translation.
            expect(await child.get({ namespace: 'app', key: 'hi', locale: 'pt-BR' }))
                .toEqual('Hallo');
        });

        it('overrides.fallback === undefined clears the inherited fallback', async () => {
            const parent = new Ilingo({
                store: new MemoryStore({
                    data: toCatalog({
                        de: { app: { hi: 'Hallo' } },
                        en: { app: { hi: 'Hello' } },
                    }),
                }),
                locale: 'en',
                fallback: 'de',
            });

            // Explicit `undefined` should clear the inherited 'de' fallback,
            // so a pt-BR lookup walks BCP-47 parents then ends at the
            // default 'en' (not at 'de').
            const child = parent.clone({ fallback: undefined });

            expect(await child.get({ namespace: 'app', key: 'hi', locale: 'pt-BR' }))
                .toEqual('Hello');
        });

        it('overrides.onMissingKey === undefined clears the inherited handler', () => {
            // Regression: clone() previously used `??` for onMissingKey,
            // so passing `undefined` couldn't restore the default warn-once
            // behaviour. Fixed to use `in`-check like `fallback`.
            const parentHandler = vi.fn(() => 'PARENT');
            const parent = new Ilingo({
                store: new MemoryStore({ data: defineCatalog([]) }),
                onMissingKey: parentHandler,
            });

            const child = parent.clone({ onMissingKey: undefined });

            // Internal check: the child should NOT carry the parent's handler.
            // Reach into the protected field via type cast (this is a
            // test-only invariant assertion — runtime behaviour is what
            // matters, but the field-level check makes the fix obvious).
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            expect((child as any).onMissingKey).toBeUndefined();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            expect((parent as any).onMissingKey).toBe(parentHandler);
        });
    });
});
