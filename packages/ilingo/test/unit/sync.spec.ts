/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    afterEach, beforeEach, describe, expect, it, vi,
} from 'vitest';
import { markInstanceof } from '@ebec/core';
import type {
    IStore, Leaf, StoreGetContext,
} from '../../src';
import {
    Ilingo,
    IlingoError,
    LoaderStore,
    MemoryStore,
    SyncUnavailableError,
    defineCatalog,
    defineLocale,
    defineNamespace,
    definePlural,
    defineTranslations,
    isIlingoError,
    isSyncUnavailableError,
    throwSyncUnavailable,
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

/**
 * Async-only adapter — the shape a remote/HTTP backend has, written the way the
 * port documents it: `getSync` is implemented, and declines.
 */
class AsyncOnlyStore implements IStore {
    readonly id = Symbol('AsyncOnlyStore');

    constructor(protected leaf: Leaf | undefined = undefined) {}

    async get(_context: StoreGetContext): Promise<Leaf | undefined> {
        return this.leaf;
    }

    getSync(context: StoreGetContext): Leaf | undefined {
        throwSyncUnavailable(context, this.id);
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
        it('throws when an async-only store is reached before a hit', () => {
            const ilingo = make(new AsyncOnlyStore('Remote'), new MemoryStore({ data: catalog }));

            expect(() => ilingo.getSync({ namespace: 'app', key: 'hi', data: { name: 'Peter' } }))
                .toThrow(SyncUnavailableError);
        });

        it('names the offending store and lookup on the error', () => {
            const store = new AsyncOnlyStore();
            const ilingo = make(store);

            try {
                ilingo.getSync({ namespace: 'app', key: 'hi', locale: 'de' });
                expect.unreachable('should have thrown');
            } catch (e) {
                expect(isSyncUnavailableError(e)).toBe(true);
                const error = e as SyncUnavailableError;
                expect(error.storeId).toBe(store.id);
                expect(error.namespace).toEqual('app');
                expect(error.key).toEqual('hi');
                expect(error.locale).toEqual('de');
            }
        });

        it('does not run the missing-key handler when it bailed out', () => {
            const onMissingKey = vi.fn(() => 'fallback');
            const ilingo = new Ilingo({
                store: new AsyncOnlyStore(),
                onMissingKey,
            });

            // Not a miss — so the handler must stay out of it. This is the
            // distinction the throw buys: `undefined` from getSync now means
            // "missing key" and nothing else.
            expect(() => ilingo.getSync({ namespace: 'app', key: 'hi' }))
                .toThrow(SyncUnavailableError);
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

            expect(() => ilingo.getSync(ctx)).toThrow(SyncUnavailableError);
            expect(await ilingo.get(ctx)).toEqual('Hallo Peter');
            // Warm now — and the sync answer agrees with the async one.
            expect(ilingo.getSync(ctx)).toEqual('Hallo Peter');
        });
    });

    describe('side effects', () => {
        it('does not start a LoaderStore load', async () => {
            const loader = vi.fn(() => defineTranslations({ hi: 'Hello' }));
            const ilingo = make(new LoaderStore({ loader }));

            // Reading synchronously must stay read-only: kicking off the load
            // here would make a render-path call trigger I/O. It declines
            // instead — hence the throw.
            expect(() => ilingo.getSync({ namespace: 'app', key: 'hi' }))
                .toThrow(SyncUnavailableError);
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
            expect(() => store.getSync({ locale: 'en', namespace: 'app', key: 'hi' }))
                .toThrow(SyncUnavailableError);

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

        it('is recognised across duplicate package copies', () => {
            // The guard is marker-based (Symbol.for), so an error thrown by
            // another copy of ilingo — e.g. the one inside @ilingo/fs — is
            // still caught by an app compiled against this one. The marker
            // rides @ebec/core's `@instanceof` chain, so a foreign instance is
            // simulated the way a foreign copy would actually build one.
            const error = new SyncUnavailableError('cold', { locale: 'en' });
            const foreign = {};
            markInstanceof(foreign, Symbol.for('ilingo/SyncUnavailableError'));

            expect(isSyncUnavailableError(error)).toBe(true);
            expect(isIlingoError(error)).toBe(true);
            expect(error instanceof SyncUnavailableError).toBe(true);
            expect(error instanceof IlingoError).toBe(true);
            expect(error instanceof Error).toBe(true);
            expect(isSyncUnavailableError(foreign)).toBe(true);
            expect(isSyncUnavailableError(new Error('other'))).toBe(false);
            expect(isIlingoError(new Error('other'))).toBe(false);
        });

        it('survives a toJSON round-trip', () => {
            // BaseError serialises the marker chain as strings, so identity
            // outlives the symbols that JSON drops.
            const error = new SyncUnavailableError('cold', {
                locale: 'en',
                namespace: 'app',
                key: 'hi',
                storeId: Symbol.for('test.store'),
            });
            const rehydrated = JSON.parse(JSON.stringify(error));

            expect(isSyncUnavailableError(rehydrated)).toBe(true);
            expect(isIlingoError(rehydrated)).toBe(true);
            expect(rehydrated.locale).toEqual('en');
            expect(rehydrated.namespace).toEqual('app');
            expect(rehydrated.key).toEqual('hi');
            expect(rehydrated.storeId).toEqual('Symbol(test.store)');
            expect(rehydrated.code).toEqual('SYNC_UNAVAILABLE_ERROR');
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

    describe('store contract', () => {
        it('gives every store both read idioms, an async-only one declining', () => {
            // getSync is part of IStore, not an opt-in capability: two outcomes
            // per idiom — a value or a failure — so a caller never has to
            // feature-detect.
            for (const store of [
                new MemoryStore({ data: catalog }),
                new LoaderStore({ loader: () => undefined }),
                new AsyncOnlyStore(),
            ]) {
                expect(typeof store.getSync).toBe('function');
            }

            expect(() => new AsyncOnlyStore().getSync({ locale: 'en', namespace: 'app', key: 'hi' }))
                .toThrow(SyncUnavailableError);
        });

        it('gives an actionable error for a pre-v7 store with no getSync', () => {
            // The shape every ilingo<7 adapter has. Without the guard this is a
            // bare "store.getSync is not a function" from inside the walk.
            const legacy = {
                id: Symbol('legacy'),
                get: async () => undefined,
                getLocales: async () => [],
            } as unknown as IStore;

            try {
                make(legacy).getSync({ namespace: 'app', key: 'hi' });
                expect.unreachable('should have thrown');
            } catch (e) {
                expect(isSyncUnavailableError(e)).toBe(true);
                expect((e as Error).message).toContain('does not implement getSync()');
                expect((e as Error).message).toContain('throwSyncUnavailable');
            }
        });

        it('throwSyncUnavailable names the store and the lookup', () => {
            try {
                throwSyncUnavailable({ locale: 'de', namespace: 'app', key: 'hi' }, 'my-store');
                expect.unreachable('should have thrown');
            } catch (e) {
                expect(isSyncUnavailableError(e)).toBe(true);
                const error = e as SyncUnavailableError;
                expect(error.message).toContain('de/app.hi');
                expect(error.message).toContain('my-store');
                expect(error.storeId).toEqual('my-store');
            }
        });

        it('MemoryStore reports a definite miss, never throwing', () => {
            const store = new MemoryStore({ data: catalog });

            expect(store.getSync({ locale: 'en', namespace: 'app', key: 'nope' })).toBeUndefined();
            expect(store.getSync({ locale: 'zz', namespace: 'app', key: 'hi' })).toBeUndefined();
        });

        it('LoaderStore throws until the pair is cached', async () => {
            const store = new LoaderStore({
                loader: () => defineTranslations({ hi: 'Hello' }),
            });
            const ctx = { locale: 'en', namespace: 'app', key: 'hi' };

            expect(() => store.getSync(ctx)).toThrow(SyncUnavailableError);

            await store.get(ctx);
            expect(store.getSync(ctx)).toEqual('Hello');
            // A cached namespace answers definite misses for its own keys.
            expect(store.getSync({ ...ctx, key: 'nope' })).toBeUndefined();

            store.invalidate('en', 'app');
            expect(() => store.getSync(ctx)).toThrow(SyncUnavailableError);
        });

        it('LoaderStore reports a cached loader miss as a definite miss', async () => {
            const store = new LoaderStore({ loader: () => undefined });
            const ctx = { locale: 'en', namespace: 'app', key: 'hi' };

            await store.get(ctx);
            expect(store.getSync(ctx)).toBeUndefined();
        });
    });
});
