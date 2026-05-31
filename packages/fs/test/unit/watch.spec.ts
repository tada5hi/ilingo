/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { isInvalidatingStore } from 'ilingo';
import { FSStore } from '../../src';

describe('FSStore.watch (#904)', () => {
    let tmpDir: string;

    beforeEach(async () => {
        tmpDir = await mkdtemp(path.join(os.tmpdir(), 'ilingo-fs-watch-'));
        await mkdir(path.join(tmpDir, 'en'), { recursive: true });
        await writeFile(
            path.join(tmpDir, 'en', 'app.json'),
            JSON.stringify({ hi: 'Hello' }),
        );
    });

    afterEach(async () => {
        await rm(tmpDir, { recursive: true, force: true });
    });

    it('FSStore is an InvalidatingStore', () => {
        const store = new FSStore({ directory: tmpDir });
        expect(isInvalidatingStore(store)).toBe(true);
    });

    it('invalidate() drops the cache so next get() re-reads disk', async () => {
        const store = new FSStore({ directory: tmpDir });

        expect(await store.get({ locale: 'en', namespace: 'app', key: 'hi' }))
            .toEqual('Hello');

        // Mutate the file directly (simulating an editor save).
        await writeFile(
            path.join(tmpDir, 'en', 'app.json'),
            JSON.stringify({ hi: 'Hallo' }),
        );

        // Without invalidate, cache still serves the old value.
        expect(await store.get({ locale: 'en', namespace: 'app', key: 'hi' }))
            .toEqual('Hello');

        store.invalidate('en', 'app');

        expect(await store.get({ locale: 'en', namespace: 'app', key: 'hi' }))
            .toEqual('Hallo');
    });

    it('watch: true emits invalidate when a watched file changes', async () => {
        const store = new FSStore({ directory: tmpDir, watch: true });
        // Pre-load so there's something to invalidate.
        await store.get({ locale: 'en', namespace: 'app', key: 'hi' });

        // Allow chokidar to attach (it's async; `ready` event isn't surfaced
        // by the store but a short timeout reliably covers attachment time).
        await new Promise((r) => setTimeout(r, 100));

        const events: Array<[string | undefined, string | undefined]> = [];
        store.on('invalidate', (locale, namespace) => {
            events.push([locale, namespace]);
        });

        await writeFile(
            path.join(tmpDir, 'en', 'app.json'),
            JSON.stringify({ hi: 'Hallo (updated)' }),
        );

        // Poll briefly for the event.
        const deadline = Date.now() + 2000;
        while (events.length === 0 && Date.now() < deadline) {
            // eslint-disable-next-line no-await-in-loop
            await new Promise((r) => setTimeout(r, 50));
        }

        expect(events).toContainEqual(['en', 'app']);

        // The next get() reflects the new content (cache was dropped).
        expect(await store.get({ locale: 'en', namespace: 'app', key: 'hi' }))
            .toEqual('Hallo (updated)');

        await store.close();
    });

    it('close() detaches listeners and stops the watcher (idempotent)', async () => {
        const store = new FSStore({ directory: tmpDir, watch: true });
        await store.close();
        // Calling close again should not throw.
        await store.close();
    });
});
