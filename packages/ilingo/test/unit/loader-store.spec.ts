/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it, vi } from 'vitest';
import { Ilingo, LoaderStore, isInvalidatingStore } from '../../src';

describe('LoaderStore (#903)', () => {
    it('lazy-loads a (locale, group) on first get, then caches', async () => {
        const loader = vi.fn(async (locale: string, group: string) => {
            if (locale === 'en' && group === 'app') return { greeting: 'Hello' };
            return undefined;
        });

        const store = new LoaderStore({ loader });
        const ilingo = new Ilingo({ store });

        expect(await ilingo.get({ group: 'app', key: 'greeting' })).toEqual('Hello');
        expect(await ilingo.get({ group: 'app', key: 'greeting' })).toEqual('Hello');
        expect(await ilingo.get({ group: 'app', key: 'greeting' })).toEqual('Hello');

        // Loader called exactly once for the (locale, group) — subsequent
        // get()s hit the cache.
        expect(loader).toHaveBeenCalledTimes(1);
    });

    it('caches misses (loader returning undefined is not re-called)', async () => {
        const loader = vi.fn(async () => undefined);
        const store = new LoaderStore({ loader });
        const ilingo = new Ilingo({ store });

        await ilingo.get({ group: 'app', key: 'x' });
        await ilingo.get({ group: 'app', key: 'y' });
        await ilingo.get({ group: 'app', key: 'z' });

        // All three keys live in the same (locale=en, group=app) bucket;
        // the loader was called once and its `undefined` was cached.
        expect(loader).toHaveBeenCalledTimes(1);
    });

    it('de-duplicates concurrent loads for the same (locale, group)', async () => {
        let resolveLoader: (v: { hi: string } | undefined) => void = () => {};
        const loader = vi.fn(() => new Promise<{ hi: string } | undefined>((r) => {
            resolveLoader = r;
        }));

        const store = new LoaderStore({ loader });
        const ilingo = new Ilingo({ store });

        // Fire three concurrent get()s before the loader resolves.
        const p1 = ilingo.get({ group: 'app', key: 'hi' });
        const p2 = ilingo.get({ group: 'app', key: 'hi' });
        const p3 = ilingo.get({ group: 'app', key: 'hi' });

        resolveLoader({ hi: 'Hello' });

        expect(await p1).toEqual('Hello');
        expect(await p2).toEqual('Hello');
        expect(await p3).toEqual('Hello');

        // Despite three concurrent get()s, loader fired once.
        expect(loader).toHaveBeenCalledTimes(1);
    });

    it('invalidate() drops the cache and re-runs the loader on next get', async () => {
        let count = 0;
        const loader = vi.fn(async () => ({ greeting: `Hello ${++count}` }));

        const store = new LoaderStore({ loader });
        const ilingo = new Ilingo({ store });

        expect(await ilingo.get({ group: 'app', key: 'greeting' })).toEqual('Hello 1');
        expect(await ilingo.get({ group: 'app', key: 'greeting' })).toEqual('Hello 1');

        store.invalidate();
        expect(await ilingo.get({ group: 'app', key: 'greeting' })).toEqual('Hello 2');

        store.invalidate('en');
        expect(await ilingo.get({ group: 'app', key: 'greeting' })).toEqual('Hello 3');

        store.invalidate('en', 'app');
        expect(await ilingo.get({ group: 'app', key: 'greeting' })).toEqual('Hello 4');

        // Invalidating an unrelated scope must NOT drop our entry.
        store.invalidate('de');
        expect(await ilingo.get({ group: 'app', key: 'greeting' })).toEqual('Hello 4');

        store.invalidate('en', 'unrelated');
        expect(await ilingo.get({ group: 'app', key: 'greeting' })).toEqual('Hello 4');
    });

    it('on("invalidate") fires with the invalidation scope', async () => {
        const store = new LoaderStore({ loader: async () => ({}) });
        const events: Array<[string | undefined, string | undefined]> = [];
        const stop = store.on('invalidate', (locale, group) => {
            events.push([locale, group]);
        });

        store.invalidate();
        store.invalidate('en');
        store.invalidate('en', 'app');

        stop();
        store.invalidate('shouldnt-fire');

        expect(events).toEqual([
            [undefined, undefined],
            ['en', undefined],
            ['en', 'app'],
        ]);
    });

    it('is an InvalidatingStore (type guard)', () => {
        const store = new LoaderStore({ loader: async () => ({}) });
        expect(isInvalidatingStore(store)).toBe(true);
    });

    it('returns plural leaves untouched', async () => {
        const store = new LoaderStore({
            loader: async () => ({
                items: {
                    '@plural': { one: '1 item', other: '{{count}} items' },
                },
            }),
        });
        const ilingo = new Ilingo({ store });

        expect(await ilingo.get({ group: 'cart', key: 'items', count: 1 }))
            .toEqual('1 item');
        expect(await ilingo.get({ group: 'cart', key: 'items', count: 7 }))
            .toEqual('7 items');
    });

    it('getLocales() returns the declared list when provided', async () => {
        const store = new LoaderStore({
            loader: async () => ({}),
            locales: ['en', 'de', 'fr'],
        });
        expect(await store.getLocales()).toEqual(['en', 'de', 'fr']);
    });

    it('getLocales() falls back to seen-so-far when not declared', async () => {
        const store = new LoaderStore({
            loader: async () => ({ hi: 'Hello' }),
        });

        // No loads yet → empty.
        expect(await store.getLocales()).toEqual([]);

        await store.get({ locale: 'en', group: 'app', key: 'hi' });
        await store.get({ locale: 'de', group: 'app', key: 'hi' });

        expect((await store.getLocales()).sort()).toEqual(['de', 'en']);
    });

    it('set() persists in cache and survives subsequent get()s without re-loading', async () => {
        const loader = vi.fn(async () => ({}));
        const store = new LoaderStore({ loader });

        await store.set({ locale: 'en', group: 'app', key: 'hi', value: 'Hello' });
        expect(await store.get({ locale: 'en', group: 'app', key: 'hi' })).toEqual('Hello');

        // Loader called once during set()'s preloading; subsequent get() reads cache.
        expect(loader).toHaveBeenCalledTimes(1);
    });
});
