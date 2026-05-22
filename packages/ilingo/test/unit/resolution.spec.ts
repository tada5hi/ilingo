/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Ilingo, MemoryStore } from '../../src';

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
                data: {
                    en: {
                        cart: {
                            items: {
                                one: '{{count}} item',
                                other: '{{count}} items',
                            },
                        },
                    },
                    cy: {
                        cart: {
                            items: {
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
        });

        it('selects "one" for count === 1', async () => {
            expect(
                await make().get({ group: 'cart', key: 'items', count: 1 }),
            ).toEqual('1 item');
        });

        it('selects "other" for count === 0 in English', async () => {
            expect(
                await make().get({ group: 'cart', key: 'items', count: 0 }),
            ).toEqual('0 items');
        });

        it('selects "zero" in Welsh', async () => {
            expect(
                await make().get({
                    group: 'cart', key: 'items', count: 0, locale: 'cy',
                }),
            ).toEqual('dim eitemau');
        });

        it('falls back to "other" if the selected category is absent', async () => {
            const ilingo = new Ilingo({
                store: new MemoryStore({
                    data: { en: { cart: { items: { other: '{{count}} items' } } } },
                }),
            });
            expect(
                await ilingo.get({ group: 'cart', key: 'items', count: 1 }),
            ).toEqual('1 items');
        });

        it('returns the plain string when count is omitted on a plural leaf', async () => {
            // Documented behaviour: without count, default to `other`.
            expect(
                await make().get({ group: 'cart', key: 'items' }),
            ).toEqual('{{count}} items');
        });

        it('count merges into data without overriding an explicit value', async () => {
            const ilingo = new Ilingo({
                store: new MemoryStore({
                    data: {
                        en: {
                            cart: {
                                items: {
                                    one: '{{count}} of {{total}}',
                                    other: '{{count}} of {{total}}',
                                },
                            },
                        },
                    },
                }),
            });
            expect(
                await ilingo.get({
                    group: 'cart',
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
                    data: {
                        pt: { app: { hi: 'olá pt' } },
                        'pt-BR': { app: {} },
                    },
                }),
                locale: 'pt-BR',
            });
            expect(await ilingo.get({ group: 'app', key: 'hi' })).toEqual('olá pt');
        });

        it('falls all the way to LOCALE_DEFAULT', async () => {
            const ilingo = new Ilingo({
                store: new MemoryStore({
                    data: { en: { app: { hi: 'hello' } } },
                }),
                locale: 'pt-BR',
            });
            expect(await ilingo.get({ group: 'app', key: 'hi' })).toEqual('hello');
        });

        it('respects an explicit string fallback', async () => {
            const ilingo = new Ilingo({
                store: new MemoryStore({
                    data: { es: { app: { hi: 'hola' } } },
                }),
                locale: 'pt-BR',
                fallback: 'es',
            });
            expect(await ilingo.get({ group: 'app', key: 'hi' })).toEqual('hola');
        });

        it('respects an explicit fallback array, in order', async () => {
            const ilingo = new Ilingo({
                store: new MemoryStore({
                    data: {
                        fr: { app: { hi: 'salut' } },
                        es: { app: { hi: 'hola' } },
                    },
                }),
                locale: 'pt-BR',
                fallback: ['es', 'fr'],
            });
            expect(await ilingo.get({ group: 'app', key: 'hi' })).toEqual('hola');
        });

        it('respects a fallback resolver function', async () => {
            const ilingo = new Ilingo({
                store: new MemoryStore({
                    data: { fr: { app: { hi: 'salut' } } },
                }),
                locale: 'pt-BR',
                fallback: (locale) => (locale.startsWith('pt') ? ['fr'] : []),
            });
            expect(await ilingo.get({ group: 'app', key: 'hi' })).toEqual('salut');
        });

        it('getResolvedLocale reports which locale yielded the value', async () => {
            const ilingo = new Ilingo({
                store: new MemoryStore({
                    data: {
                        pt: { app: { hi: 'olá pt' } },
                    },
                }),
                locale: 'pt-BR',
            });
            expect(
                await ilingo.getResolvedLocale({ group: 'app', key: 'hi' }),
            ).toEqual('pt');
            expect(
                await ilingo.getResolvedLocale({ group: 'app', key: 'missing' }),
            ).toBeUndefined();
        });

        it('locale-closeness beats store priority', async () => {
            const ilingo = new Ilingo({
                store: new MemoryStore({
                    data: { en: { app: { hi: 'hello (store1)' } } },
                }),
                locale: 'pt-BR',
            });
            ilingo.stores.add(new MemoryStore({
                data: { pt: { app: { hi: 'olá (store2)' } } },
            }));
            expect(await ilingo.get({ group: 'app', key: 'hi' })).toEqual('olá (store2)');
        });
    });

    describe('#899 — missing-key handler', () => {
        it('default handler warns once per (locale, group, key) and returns undefined', async () => {
            const ilingo = new Ilingo({
                store: new MemoryStore({ data: {} }),
            });

            expect(await ilingo.get({ group: 'app', key: 'nope' })).toBeUndefined();
            expect(await ilingo.get({ group: 'app', key: 'nope' })).toBeUndefined();

            expect(warn).toHaveBeenCalledTimes(1);
            expect(warn.mock.calls[0][0]).toContain('app.nope');
        });

        it('custom handler may return a string, which becomes the result', async () => {
            const onMissingKey = vi.fn(() => 'FALLBACK');
            const ilingo = new Ilingo({
                store: new MemoryStore({ data: {} }),
                onMissingKey,
            });

            expect(await ilingo.get({ group: 'app', key: 'nope' })).toEqual('FALLBACK');
            expect(onMissingKey).toHaveBeenCalledWith(
                expect.objectContaining({ group: 'app', key: 'nope' }),
            );
        });

        it('handler receives resolvedLocale = last locale in the chain', async () => {
            const onMissingKey = vi.fn(() => undefined);
            const ilingo = new Ilingo({
                store: new MemoryStore({ data: {} }),
                locale: 'pt-BR',
                onMissingKey,
            });

            await ilingo.get({ group: 'app', key: 'nope' });

            expect(onMissingKey).toHaveBeenCalledWith(
                expect.objectContaining({ resolvedLocale: 'en' }),
            );
        });

        it('handler is not called when a hit is found', async () => {
            const onMissingKey = vi.fn();
            const ilingo = new Ilingo({
                store: new MemoryStore({ data: { en: { app: { hi: 'hello' } } } }),
                onMissingKey,
            });
            await ilingo.get({ group: 'app', key: 'hi' });
            expect(onMissingKey).not.toHaveBeenCalled();
        });

        it('warn-once state is per-instance, not shared across Ilingo instances', async () => {
            const a = new Ilingo({ store: new MemoryStore({ data: {} }) });
            const b = new Ilingo({ store: new MemoryStore({ data: {} }) });

            await a.get({ group: 'app', key: 'isolated' });
            await b.get({ group: 'app', key: 'isolated' });

            // Two instances → two warnings for the same key. Without
            // per-instance state, `b` would silently dedupe `a`'s warning.
            expect(warn).toHaveBeenCalledTimes(2);
        });
    });

    describe('plural-leaf write side (#912 review)', () => {
        it('MemoryStore.set + get round-trips a plural leaf', async () => {
            const store = new MemoryStore({ data: {} });
            await store.set({
                locale: 'en',
                group: 'cart',
                key: 'items',
                value: { one: '{{count}} item', other: '{{count}} items' },
            });

            const ilingo = new Ilingo({ store });
            expect(
                await ilingo.get({ group: 'cart', key: 'items', count: 1 }),
            ).toEqual('1 item');
            expect(
                await ilingo.get({ group: 'cart', key: 'items', count: 7 }),
            ).toEqual('7 items');
        });
    });

    describe('explicit @plural marker', () => {
        it('recognises { "@plural": { ... } } as a plural leaf', async () => {
            const ilingo = new Ilingo({
                store: new MemoryStore({
                    data: {
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
                    },
                }),
            });
            expect(
                await ilingo.get({ group: 'cart', key: 'items', count: 1 }),
            ).toEqual('1 item');
            expect(
                await ilingo.get({ group: 'cart', key: 'items', count: 3 }),
            ).toEqual('3 items');
        });

        it('disambiguates a namespace whose only key happens to be "other"', async () => {
            // Without the explicit marker, { other: 'literal' } would be
            // detected as a plural leaf and `.deeper` would fail. With the
            // marker, `other` is just a regular nested record.
            const ilingo = new Ilingo({
                store: new MemoryStore({
                    data: {
                        en: {
                            form: {
                                kind: {
                                    other: { label: 'Other' },
                                },
                            },
                        },
                    },
                }),
            });
            expect(
                await ilingo.get({ group: 'form', key: 'kind.other.label' }),
            ).toEqual('Other');
        });
    });

    describe('parallel lookup', () => {
        it('queries every store in a locale concurrently, not serially', async () => {
            // Record when each store's get() actually runs. Concurrent entry
            // means both stores start in the same microtask burst — well
            // before the 30ms simulated work has resolved. Asserting on
            // entry order (not total elapsed time) avoids CI-jitter flakes.
            const entries: { id: number, at: number }[] = [];
            const makeStore = (id: number, hit?: string) => ({
                async get(_ctx: { locale: string; group: string; key: string }) {
                    entries.push({ id, at: Date.now() });
                    await new Promise((r) => setTimeout(r, 30));
                    return hit;
                },
                async set() { /* noop */ },
                async getLocales() { return []; },
            });

            const ilingo = new Ilingo({});
            ilingo.stores.add(makeStore(1));
            ilingo.stores.add(makeStore(2, 'hello'));

            const result = await ilingo.get({ group: 'app', key: 'hi' });

            expect(result).toEqual('hello');
            expect(entries.map((e) => e.id)).toEqual([1, 2]);
            // Both stores entered well within one tick — far less than the
            // 30ms a sequential walk would have inserted between them.
            expect(entries[1].at - entries[0].at).toBeLessThan(15);
        });

        it('preserves store insertion order on a tie within a locale', async () => {
            const ilingo = new Ilingo({
                store: new MemoryStore({
                    data: { en: { app: { hi: 'from store 1' } } },
                }),
            });
            ilingo.stores.add(new MemoryStore({
                data: { en: { app: { hi: 'from store 2' } } },
            }));

            expect(await ilingo.get({ group: 'app', key: 'hi' })).toEqual('from store 1');
        });
    });
});
