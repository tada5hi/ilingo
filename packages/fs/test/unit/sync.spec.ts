/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { Ilingo, SyncUnavailableError } from 'ilingo';
import { FSStore } from '../../src';

const basePath = path.join(__dirname, '..', 'data', 'language');

/** Exposes the loaded flag so cache bookkeeping can be asserted directly. */
class ProbeStore extends FSStore {
    isNamespaceLoaded(namespace: string, locale: string): boolean {
        return this.isLoaded(namespace, locale);
    }
}

describe('FSStore — synchronous read path (#988)', () => {
    it('reads a cold namespace straight off disk', () => {
        const store = new FSStore({ directory: basePath });

        // No warm-up, no await: locter ships a synchronous twin for every read,
        // so a filesystem store can honour getSync from a cold start.
        expect(store.getSync({ locale: 'en', namespace: 'form', key: 'nested.key' }))
            .toEqual('I am nested');
    });

    it('answers across the whole extension matrix', () => {
        const store = new FSStore({ directory: basePath });

        // en/form.cjs, de/form.ts, fr/form.json — every reader locter dispatches
        // has a sync twin, so the matrix is identical on both paths.
        for (const locale of ['en', 'de', 'fr']) {
            expect(store.getSync({ locale, namespace: 'form', key: 'email' }))
                .toMatch(/mail/i);
        }
    });

    it('lets Ilingo.getSync resolve with no warm-up at all', async () => {
        const ilingo = new Ilingo({ store: new FSStore({ directory: basePath }) });
        const ctx = { namespace: 'form', key: 'nested.key' };

        expect(ilingo.getSync(ctx)).toEqual('I am nested');
        expect(ilingo.getSync(ctx)).toEqual(await ilingo.get(ctx));
    });

    it('reports a definite miss for an absent key in a real namespace', () => {
        const store = new FSStore({ directory: basePath });

        expect(store.getSync({ locale: 'en', namespace: 'form', key: 'nope' })).toBeUndefined();
    });

    it('serves the cache on subsequent reads', () => {
        const store = new ProbeStore({ directory: basePath });
        const ctx = { locale: 'en', namespace: 'form', key: 'nested.key' };

        expect(store.isNamespaceLoaded('form', 'en')).toBe(false);
        store.getSync(ctx);
        expect(store.isNamespaceLoaded('form', 'en')).toBe(true);
        expect(store.getSync(ctx)).toEqual('I am nested');
    });

    it('loadNamespaceSync primes the store without an await', () => {
        const store = new ProbeStore({ directory: basePath });

        store.loadNamespaceSync('form', 'en');

        expect(store.isNamespaceLoaded('form', 'en')).toBe(true);
    });

    it('answers during an in-flight async load instead of waiting for it', async () => {
        const store = new FSStore({ directory: basePath });
        const ctx = { locale: 'en', namespace: 'form', key: 'nested.key' };

        const pending = store.get(ctx);
        // Reads the same files itself rather than declining — the value is the
        // one the pending load is about to produce, so both agree.
        expect(store.getSync(ctx)).toEqual('I am nested');

        expect(await pending).toEqual('I am nested');
    });

    it('serves concurrent async readers from one load', async () => {
        const store = new FSStore({ directory: basePath });
        const ctx = { locale: 'en', namespace: 'form', key: 'nested.key' };

        // Both callers must see the value. Before the in-flight map, the second
        // one short-circuited on the "loaded" flag — which was set before the
        // data landed — and resolved to undefined.
        const [first, second] = await Promise.all([store.get(ctx), store.get(ctx)]);

        expect(first).toEqual('I am nested');
        expect(second).toEqual('I am nested');
    });

    it('does not let a read invalidated mid-flight mark the namespace loaded', async () => {
        const store = new ProbeStore({ directory: basePath });
        const ctx = { locale: 'en', namespace: 'form', key: 'nested.key' };

        const pending = store.get(ctx);
        store.invalidate('en', 'form');
        await pending;

        // The invalidated read must drop its result rather than repopulating a
        // cache the consumer just asked us to forget.
        expect(store.isNamespaceLoaded('form', 'en')).toBe(false);
        // …and the next read goes back to disk.
        expect(store.getSync(ctx)).toEqual('I am nested');
    });

    it('re-reads after invalidate', () => {
        const store = new ProbeStore({ directory: basePath });
        const ctx = { locale: 'en', namespace: 'form', key: 'nested.key' };

        store.getSync(ctx);
        store.invalidate('en', 'form');

        expect(store.isNamespaceLoaded('form', 'en')).toBe(false);
        expect(store.getSync(ctx)).toEqual('I am nested');
    });

    describe('when a file cannot be read synchronously', () => {
        const ctx = { locale: 'en', namespace: 'form', key: 'email' };

        class FailingStore extends FSStore {
            constructor(protected failure: unknown) {
                super({ directory: basePath });
            }

            override loadNamespaceSync(): Record<string, any> {
                throw this.failure;
            }
        }

        it('declines for a module that needs an asynchronous import', () => {
            const store = new FailingStore(
                Object.assign(new Error('cannot require'), { code: 'ERR_REQUIRE_ASYNC_MODULE' }),
            );

            expect(() => store.getSync(ctx)).toThrow(SyncUnavailableError);
        });

        it('declines when the async-only code is nested in a wrapper error', () => {
            const store = new FailingStore(new Error('load failed', {
                cause: Object.assign(new Error('inner'), { code: 'ERR_REQUIRE_ESM' }),
            }));

            expect(() => store.getSync(ctx)).toThrow(SyncUnavailableError);
        });

        it('propagates a real fault instead of dressing it up as unavailable', () => {
            // A malformed file is a fault to fix — the async load would fail the
            // same way, so it must not look like "not available yet".
            const store = new FailingStore(new SyntaxError('Unexpected token }'));

            expect(() => store.getSync(ctx)).toThrow(SyntaxError);
        });
    });
});
