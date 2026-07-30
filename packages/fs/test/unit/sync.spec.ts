/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { Ilingo, SYNC_UNAVAILABLE, isSyncStore } from 'ilingo';
import { FSStore } from '../../src';

const basePath = path.join(__dirname, '..', 'data', 'language');

describe('FSStore — synchronous read path (#988)', () => {
    it('reports SYNC_UNAVAILABLE for a namespace that is not loaded yet', () => {
        const store = new FSStore({ directory: basePath });

        expect(isSyncStore(store)).toBe(true);
        expect(store.getSync({ locale: 'en', namespace: 'form', key: 'name' }))
            .toBe(SYNC_UNAVAILABLE);
    });

    it('answers from the cache once the namespace is warm', async () => {
        const store = new FSStore({ directory: basePath });
        const ctx = { locale: 'en', namespace: 'form', key: 'nested.key' };

        await store.get(ctx);

        expect(store.getSync(ctx)).toEqual('I am nested');
        // Warm namespace, absent key — a definite miss, not "unavailable".
        expect(store.getSync({ ...ctx, key: 'nope' })).toBeUndefined();
    });

    it('makes Ilingo.getSync succeed only after warm-up', async () => {
        const ilingo = new Ilingo({ store: new FSStore({ directory: basePath }) });
        const ctx = { namespace: 'form', key: 'nested.key' };

        expect(ilingo.getSync(ctx)).toBeUndefined();

        expect(await ilingo.get(ctx)).toEqual('I am nested');
        expect(ilingo.getSync(ctx)).toEqual('I am nested');
    });

    it('stays SYNC_UNAVAILABLE for the whole in-flight window', async () => {
        const store = new FSStore({ directory: basePath });
        const ctx = { locale: 'en', namespace: 'form', key: 'nested.key' };

        const pending = store.get(ctx);
        // The load is running: the record exists but is still empty. Reporting
        // a miss here would let the orchestrator resolve a farther locale that
        // the in-flight read is about to contradict — the exact hazard
        // SYNC_UNAVAILABLE exists for.
        expect(store.getSync(ctx)).toBe(SYNC_UNAVAILABLE);

        expect(await pending).toEqual('I am nested');
        expect(store.getSync(ctx)).toEqual('I am nested');
    });

    it('serves concurrent readers from one load', async () => {
        const store = new FSStore({ directory: basePath });
        const ctx = { locale: 'en', namespace: 'form', key: 'nested.key' };

        // Both callers must see the value. Before the in-flight map, the second
        // one short-circuited on the "loaded" flag — which was set before the
        // data landed — and resolved to undefined.
        const [first, second] = await Promise.all([store.get(ctx), store.get(ctx)]);

        expect(first).toEqual('I am nested');
        expect(second).toEqual('I am nested');
    });

    it('drops a read that was invalidated mid-flight', async () => {
        const store = new FSStore({ directory: basePath });
        const ctx = { locale: 'en', namespace: 'form', key: 'nested.key' };

        const pending = store.get(ctx);
        store.invalidate('en', 'form');
        await pending;

        // The invalidated read must not have repopulated the cache, so the
        // namespace is cold again and the next get() re-reads from disk.
        expect(store.getSync(ctx)).toBe(SYNC_UNAVAILABLE);
        expect(await store.get(ctx)).toEqual('I am nested');
    });

    it('goes cold again after invalidate', async () => {
        const store = new FSStore({ directory: basePath });
        const ctx = { locale: 'en', namespace: 'form', key: 'nested.key' };

        await store.get(ctx);
        store.invalidate('en', 'form');

        expect(store.getSync(ctx)).toBe(SYNC_UNAVAILABLE);
    });
});
