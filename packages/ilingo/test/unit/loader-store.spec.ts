/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it, vi } from 'vitest';
import { Ilingo, LoaderStore, defineLines, definePlural, isInvalidatingStore } from '../../src';
import type { LinesNode } from '../../src';

describe('LoaderStore (#903)', () => {
    it('lazy-loads a (locale, namespace) on first get, then caches', async () => {
        const loader = vi.fn(async (locale: string, namespace: string) => {
            if (locale === 'en' && namespace === 'app') return defineLines({ greeting: 'Hello' });
            return undefined;
        });

        const store = new LoaderStore({ loader });
        const ilingo = new Ilingo({ store });

        expect(await ilingo.get({ namespace: 'app', key: 'greeting' })).toEqual('Hello');
        expect(await ilingo.get({ namespace: 'app', key: 'greeting' })).toEqual('Hello');
        expect(await ilingo.get({ namespace: 'app', key: 'greeting' })).toEqual('Hello');

        // Loader called exactly once for the (locale, namespace) — subsequent
        // get()s hit the cache.
        expect(loader).toHaveBeenCalledTimes(1);
    });

    it('caches misses (loader returning undefined is not re-called)', async () => {
        const loader = vi.fn(async () => undefined);
        const store = new LoaderStore({ loader });
        const ilingo = new Ilingo({ store });

        await ilingo.get({ namespace: 'app', key: 'x' });
        await ilingo.get({ namespace: 'app', key: 'y' });
        await ilingo.get({ namespace: 'app', key: 'z' });

        // All three keys live in the same (locale=en, namespace=app) bucket;
        // the loader was called once and its `undefined` was cached.
        expect(loader).toHaveBeenCalledTimes(1);
    });

    it('de-duplicates concurrent loads for the same (locale, namespace)', async () => {
        let resolveLoader: (v: LinesNode | undefined) => void = () => {};
        const loader = vi.fn(() => new Promise<LinesNode | undefined>((r) => {
            resolveLoader = r;
        }));

        const store = new LoaderStore({ loader });
        const ilingo = new Ilingo({ store });

        // Fire three concurrent get()s before the loader resolves.
        const p1 = ilingo.get({ namespace: 'app', key: 'hi' });
        const p2 = ilingo.get({ namespace: 'app', key: 'hi' });
        const p3 = ilingo.get({ namespace: 'app', key: 'hi' });

        resolveLoader(defineLines({ hi: 'Hello' }));

        expect(await p1).toEqual('Hello');
        expect(await p2).toEqual('Hello');
        expect(await p3).toEqual('Hello');

        // Despite three concurrent get()s, loader fired once.
        expect(loader).toHaveBeenCalledTimes(1);
    });

    it('invalidate() drops the cache and re-runs the loader on next get', async () => {
        let count = 0;
        const loader = vi.fn(async () => defineLines({ greeting: `Hello ${++count}` }));

        const store = new LoaderStore({ loader });
        const ilingo = new Ilingo({ store });

        expect(await ilingo.get({ namespace: 'app', key: 'greeting' })).toEqual('Hello 1');
        expect(await ilingo.get({ namespace: 'app', key: 'greeting' })).toEqual('Hello 1');

        store.invalidate();
        expect(await ilingo.get({ namespace: 'app', key: 'greeting' })).toEqual('Hello 2');

        store.invalidate('en');
        expect(await ilingo.get({ namespace: 'app', key: 'greeting' })).toEqual('Hello 3');

        store.invalidate('en', 'app');
        expect(await ilingo.get({ namespace: 'app', key: 'greeting' })).toEqual('Hello 4');

        // Invalidating an unrelated scope must NOT drop our entry.
        store.invalidate('de');
        expect(await ilingo.get({ namespace: 'app', key: 'greeting' })).toEqual('Hello 4');

        store.invalidate('en', 'unrelated');
        expect(await ilingo.get({ namespace: 'app', key: 'greeting' })).toEqual('Hello 4');
    });

    it('on("invalidate") fires with the invalidation scope', async () => {
        const store = new LoaderStore({ loader: async () => defineLines({}) });
        const events: Array<[string | undefined, string | undefined]> = [];
        const stop = store.on('invalidate', (locale, namespace) => {
            events.push([locale, namespace]);
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

    it('is an IInvalidatingStore (type guard)', () => {
        const store = new LoaderStore({ loader: async () => defineLines({}) });
        expect(isInvalidatingStore(store)).toBe(true);
    });

    it('returns plural leaves untouched', async () => {
        const store = new LoaderStore({
            loader: async () => defineLines({
                items: definePlural({ one: '1 item', other: '{{count}} items' }),
            }),
        });
        const ilingo = new Ilingo({ store });

        expect(await ilingo.get({ namespace: 'cart', key: 'items', count: 1 }))
            .toEqual('1 item');
        expect(await ilingo.get({ namespace: 'cart', key: 'items', count: 7 }))
            .toEqual('7 items');
    });

    it('getLocales() returns the declared list when provided', async () => {
        const store = new LoaderStore({
            loader: async () => defineLines({}),
            locales: ['en', 'de', 'fr'],
        });
        expect(await store.getLocales()).toEqual(['en', 'de', 'fr']);
    });

    it('getLocales() falls back to seen-so-far when not declared', async () => {
        const store = new LoaderStore({
            loader: async () => defineLines({ hi: 'Hello' }),
        });

        // No loads yet → empty.
        expect(await store.getLocales()).toEqual([]);

        await store.get({ locale: 'en', namespace: 'app', key: 'hi' });
        await store.get({ locale: 'de', namespace: 'app', key: 'hi' });

        expect((await store.getLocales()).sort()).toEqual(['de', 'en']);
    });

    it('set() persists in cache and survives subsequent get()s without re-loading', async () => {
        const loader = vi.fn(async () => defineLines({}));
        const store = new LoaderStore({ loader });

        await store.set({ locale: 'en', namespace: 'app', key: 'hi', value: 'Hello' });
        expect(await store.get({ locale: 'en', namespace: 'app', key: 'hi' })).toEqual('Hello');

        // Loader called once during set()'s preloading; subsequent get() reads cache.
        expect(loader).toHaveBeenCalledTimes(1);
    });

    it('invalidate during an in-flight load drops the stale result', async () => {
        // Regression: previously the loader's .then() unconditionally wrote
        // the resolved record into the cache. An invalidate fired between
        // load start and resolve would be silently overwritten.
        let resolveFirst: (v: LinesNode) => void = () => {};
        let firstCall = true;
        const loader = vi.fn(() => {
            if (firstCall) {
                firstCall = false;
                return new Promise<LinesNode>((r) => { resolveFirst = r; });
            }
            return defineLines({ hi: 'Fresh' });
        });

        const store = new LoaderStore({ loader });
        const ilingo = new Ilingo({ store });

        // Start the slow load.
        const p1 = ilingo.get({ namespace: 'app', key: 'hi' });
        // Invalidate while it's in flight.
        store.invalidate('en', 'app');
        // Now resolve the slow load — its result must NOT land in the cache.
        resolveFirst(defineLines({ hi: 'Stale' }));
        await p1;

        // Fresh get must re-run the loader (the stale result was dropped).
        expect(await ilingo.get({ namespace: 'app', key: 'hi' })).toEqual('Fresh');
        expect(loader).toHaveBeenCalledTimes(2);
    });

    it('set() fires the invalidate event so subscribers can re-render', async () => {
        // Regression: set() mutated the cache without notifying subscribers,
        // so a Vue composable hooked into the store would not re-render
        // when a translation was set at runtime.
        const store = new LoaderStore({ loader: async () => defineLines({}) });
        const events: Array<[string | undefined, string | undefined]> = [];
        store.on('invalidate', (locale, namespace) => {
            events.push([locale, namespace]);
        });

        await store.set({ locale: 'en', namespace: 'app', key: 'hi', value: 'Hello' });

        expect(events).toEqual([['en', 'app']]);
    });

    it('cache keys do not collide when namespace/locale strings contain a pipe', async () => {
        // Regression: previous KEY_SEP was '|', which could collide if a
        // namespace name contained '|' (e.g. namespace="a|b"). NUL byte is now used.
        const loaded: string[] = [];
        const store = new LoaderStore({
            loader: async (locale, namespace) => {
                loaded.push(`${locale}/${namespace}`);
                return defineLines({ hi: `from ${namespace}` });
            },
        });

        const v1 = await store.get({ locale: 'en', namespace: 'a|b', key: 'hi' });
        const v2 = await store.get({ locale: 'en|a', namespace: 'b', key: 'hi' });

        expect(v1).toEqual('from a|b');
        expect(v2).toEqual('from b');
        expect(loaded).toEqual(['en/a|b', 'en|a/b']);
    });
});
