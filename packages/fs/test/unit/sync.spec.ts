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

    it('goes cold again after invalidate', async () => {
        const store = new FSStore({ directory: basePath });
        const ctx = { locale: 'en', namespace: 'form', key: 'nested.key' };

        await store.get(ctx);
        store.invalidate('en', 'form');

        expect(store.getSync(ctx)).toBe(SYNC_UNAVAILABLE);
    });
});
