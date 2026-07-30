/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    afterEach, beforeEach, describe, expect, it, vi,
} from 'vitest';
import type {
    IStore, Leaf, StoreGetContext,
} from '../../src';
import {
    Ilingo,
    LoaderStore,
    MemoryStore,
    SYNC_UNAVAILABLE,
    defineCatalog,
    defineLocale,
    defineNamespace,
    definePlural,
    defineTranslations,
    isSyncStore,
} from '../../src';

const catalog = defineCatalog([
    defineLocale('en', [
        defineNamespace('app', [
            defineTranslations({
                hi: 'Hello {{name}}',
                items: definePlural({ one: '{{count}} item', other: '{{count}} items' }),
                nested: { deep: 'Deep' },
            }),
        ]),
    ]),
    defineLocale('de', [
        defineNamespace('app', [defineTranslations({ hi: 'Hallo {{name}}' })]),
    ]),
]);

/** Async-only adapter — the shape a remote/HTTP backend has. */
class AsyncOnlyStore implements IStore {
    readonly id = Symbol('AsyncOnlyStore');

    constructor(protected leaf: Leaf | undefined = undefined) {}

    async get(_context: StoreGetContext): Promise<Leaf | undefined> {
        return this.leaf;
    }

    async getLocales(): Promise<string[]> {
        return [];
    }
}

describe('Ilingo — synchronous read path (#988)', () => {
    let warn: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    });

    afterEach(() => {
        warn.mockRestore();
    });

    const make = (...stores: IStore[]) => new Ilingo({
        store: stores.length > 0 ? stores : new MemoryStore({ data: catalog }),
    });

    describe('equivalence with get()', () => {
        it('resolves an in-memory hit synchronously', () => {
            expect(make().getSync({ namespace: 'app', key: 'hi', data: { name: 'Peter' } }))
                .toEqual('Hello Peter');
        });

        it('matches get() for interpolation, plural and fallback', async () => {
            const ilingo = make();
            const contexts = [
                { namespace: 'app', key: 'hi', data: { name: 'Peter' } },
                { namespace: 'app', key: 'items', count: 1 },
                { namespace: 'app', key: 'items', count: 5 },
                { namespace: 'app', key: 'nested.deep' },
                // 'de' has no `items` — falls back to 'en' down the chain.
                { namespace: 'app', key: 'items', count: 2, locale: 'de' },
                { namespace: 'app', key: 'hi', data: { name: 'Peter' }, locale: 'de' },
            ];

            for (const ctx of contexts) {
                expect(ilingo.getSync(ctx)).toEqual(await ilingo.get(ctx));
            }
        });

        it('routes a genuinely missing key through onMissingKey, like get()', async () => {
            const ilingo = new Ilingo({
                store: new MemoryStore({ data: catalog }),
                onMissingKey: (ctx) => `!${ctx.namespace}.${ctx.key}`,
            });

            expect(ilingo.getSync({ namespace: 'app', key: 'nope' })).toEqual('!app.nope');
            expect(await ilingo.get({ namespace: 'app', key: 'nope' })).toEqual('!app.nope');
        });

        it('returns undefined for a missing key without a handler', () => {
            expect(make().getSync({ namespace: 'app', key: 'nope' })).toBeUndefined();
        });

        it('returns undefined when no store is registered', () => {
            expect(new Ilingo().getSync({ namespace: 'app', key: 'hi' })).toBeUndefined();
        });
    });

    describe('stores that cannot answer synchronously', () => {
        it('bails out when an async-only store is reached before a hit', () => {
            const ilingo = make(new AsyncOnlyStore('Remote'), new MemoryStore({ data: catalog }));

            expect(ilingo.getSync({ namespace: 'app', key: 'hi', data: { name: 'Peter' } }))
                .toBeUndefined();
        });

        it('does not run the missing-key handler when it bailed out', () => {
            const onMissingKey = vi.fn(() => 'fallback');
            const ilingo = new Ilingo({
                store: new AsyncOnlyStore(),
                onMissingKey,
            });

            expect(ilingo.getSync({ namespace: 'app', key: 'hi' })).toBeUndefined();
            expect(onMissingKey).not.toHaveBeenCalled();
        });

        it('still answers when the hit precedes the async-only store', async () => {
            const ilingo = make(
                new MemoryStore({ data: catalog }),
                new AsyncOnlyStore('Remote'),
            );
            const ctx = { namespace: 'app', key: 'hi', data: { name: 'Peter' } };

            // The async walk stops at the first hit too, so the sync answer is
            // the same value — the later store is never consulted either way.
            expect(ilingo.getSync(ctx)).toEqual('Hello Peter');
            expect(await ilingo.get(ctx)).toEqual('Hello Peter');
        });

        it('bails out rather than resolving a fallback locale the async walk would not reach', async () => {
            // A cold store holds 'de', a warm one only 'en'. Answering "miss"
            // for the cold store would resolve to the English string, while
            // get() resolves the German one.
            const cold = new LoaderStore({
                loader: () => defineTranslations({ hi: 'Hallo {{name}}' }),
            });
            const warm = new MemoryStore({
                data: defineCatalog([
                    defineLocale('en', [
                        defineNamespace('app', [defineTranslations({ hi: 'Hello {{name}}' })]),
                    ]),
                ]),
            });
            const ilingo = make(cold, warm);
            const ctx = { namespace: 'app', key: 'hi', locale: 'de', data: { name: 'Peter' } };

            expect(ilingo.getSync(ctx)).toBeUndefined();
            expect(await ilingo.get(ctx)).toEqual('Hallo Peter');
            // Warm now — and the sync answer agrees with the async one.
            expect(ilingo.getSync(ctx)).toEqual('Hallo Peter');
        });
    });

    describe('side effects', () => {
        it('does not start a LoaderStore load', async () => {
            const loader = vi.fn(() => defineTranslations({ hi: 'Hello' }));
            const ilingo = make(new LoaderStore({ loader }));

            ilingo.getSync({ namespace: 'app', key: 'hi' });
            // Reading synchronously must stay read-only: kicking off the load
            // here would make a render-path call trigger I/O.
            expect(loader).not.toHaveBeenCalled();

            expect(await ilingo.get({ namespace: 'app', key: 'hi' })).toEqual('Hello');
            expect(loader).toHaveBeenCalledTimes(1);
        });

        it('reports SYNC_UNAVAILABLE while a load is in flight', async () => {
            let settle!: (value: unknown) => void;
            const store = new LoaderStore({
                loader: () => new Promise((resolve) => { settle = resolve; }),
            });
            const ilingo = make(store);

            const pending = ilingo.get({ namespace: 'app', key: 'hi' });
            // Mid-flight the cache is still empty — reporting a miss here would
            // hand out a fallback the async call is about to contradict.
            expect(store.getSync({ locale: 'en', namespace: 'app', key: 'hi' }))
                .toBe(SYNC_UNAVAILABLE);

            settle(defineTranslations({ hi: 'Hello' }));
            expect(await pending).toEqual('Hello');
        });

        it('shares the warn-once memo with get(), so a miss warns once in total', async () => {
            const ilingo = make();

            ilingo.getSync({ namespace: 'app', key: 'nope' });
            await ilingo.get({ namespace: 'app', key: 'nope' });

            expect(warn).toHaveBeenCalledTimes(1);
        });

        it('runs onMissingKey on both paths — a handler with side effects sees two calls', async () => {
            const onMissingKey = vi.fn(() => 'fallback');
            const ilingo = new Ilingo({ store: new MemoryStore({ data: catalog }), onMissingKey });

            expect(ilingo.getSync({ namespace: 'app', key: 'nope' })).toEqual('fallback');
            expect(await ilingo.get({ namespace: 'app', key: 'nope' })).toEqual('fallback');

            // Documented consequence of the equivalence guarantee: seeding a
            // consumer (e.g. @ilingo/vue) means a missing key reaches the
            // handler once for the seed and once for the async pass. Handlers
            // that report to telemetry should dedupe on (locale, namespace, key).
            expect(onMissingKey).toHaveBeenCalledTimes(2);
        });
    });

    describe('edge cases', () => {
        it('preserves an empty-string leaf on both paths', async () => {
            const ilingo = make(new MemoryStore({
                data: defineCatalog([
                    defineLocale('en', [defineNamespace('app', [defineTranslations({ blank: '' })])]),
                ]),
            }));
            const ctx = { namespace: 'app', key: 'blank' };

            expect(ilingo.getSync(ctx)).toEqual('');
            expect(await ilingo.get(ctx)).toEqual('');
        });

        it('honours a fallback opt-out identically', async () => {
            const ilingo = new Ilingo({
                store: new MemoryStore({ data: catalog }),
                fallback: false,
                locale: 'fr',
            });
            const ctx = { namespace: 'app', key: 'hi' };

            expect(ilingo.getSync(ctx)).toEqual(await ilingo.get(ctx));
            expect(ilingo.getSync(ctx)).toBeUndefined();
        });

        it('works on a clone(), scoped store first', async () => {
            const parent = make();
            const child = parent.clone({
                store: new MemoryStore({
                    data: defineCatalog([
                        defineLocale('en', [defineNamespace('app', [defineTranslations({ hi: 'Scoped' })])]),
                    ]),
                }),
            });

            expect(child.getSync?.({ namespace: 'app', key: 'hi' })).toEqual('Scoped');
            expect(await child.get({ namespace: 'app', key: 'hi' })).toEqual('Scoped');
        });
    });

    describe('store capability', () => {
        it('detects sync-capable stores', () => {
            expect(isSyncStore(new MemoryStore({ data: catalog }))).toBe(true);
            expect(isSyncStore(new LoaderStore({ loader: () => undefined }))).toBe(true);
            expect(isSyncStore(new AsyncOnlyStore())).toBe(false);
        });

        it('MemoryStore reports a definite miss, never SYNC_UNAVAILABLE', () => {
            const store = new MemoryStore({ data: catalog });

            expect(store.getSync({ locale: 'en', namespace: 'app', key: 'nope' })).toBeUndefined();
            expect(store.getSync({ locale: 'zz', namespace: 'app', key: 'hi' })).toBeUndefined();
        });

        it('LoaderStore reports SYNC_UNAVAILABLE until the pair is cached', async () => {
            const store = new LoaderStore({
                loader: () => defineTranslations({ hi: 'Hello' }),
            });
            const ctx = { locale: 'en', namespace: 'app', key: 'hi' };

            expect(store.getSync(ctx)).toBe(SYNC_UNAVAILABLE);

            await store.get(ctx);
            expect(store.getSync(ctx)).toEqual('Hello');
            // A cached namespace answers definite misses for its own keys.
            expect(store.getSync({ ...ctx, key: 'nope' })).toBeUndefined();

            store.invalidate('en', 'app');
            expect(store.getSync(ctx)).toBe(SYNC_UNAVAILABLE);
        });

        it('LoaderStore reports a cached loader miss as a definite miss', async () => {
            const store = new LoaderStore({ loader: () => undefined });
            const ctx = { locale: 'en', namespace: 'app', key: 'hi' };

            await store.get(ctx);
            expect(store.getSync(ctx)).toBeUndefined();
        });
    });
});
