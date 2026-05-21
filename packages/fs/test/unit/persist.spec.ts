/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Ilingo } from 'ilingo';
import { FSStore } from '../../src';

describe('FSStore.set persistence', () => {
    let tmpDir: string;

    beforeEach(async () => {
        tmpDir = await mkdtemp(path.join(os.tmpdir(), 'ilingo-fs-'));
    });

    afterEach(async () => {
        await rm(tmpDir, { recursive: true, force: true });
    });

    it('writes a new key to <writeDirectory>/<locale>/<group>.json', async () => {
        const store = new FSStore({ directory: tmpDir });

        await store.set({
            locale: 'en',
            group: 'app',
            key: 'greeting',
            value: 'Hello {{name}}',
        });

        const written = await readFile(
            path.join(tmpDir, 'en', 'app.json'),
            'utf8',
        );

        expect(JSON.parse(written)).toEqual({
            greeting: 'Hello {{name}}',
        });
    });

    it('round-trips through a fresh FSStore instance', async () => {
        const writer = new FSStore({ directory: tmpDir });
        await writer.set({
            locale: 'de',
            group: 'app',
            key: 'greeting',
            value: 'Hallo {{name}}',
        });

        const reader = new FSStore({ directory: tmpDir });
        const ilingo = new Ilingo({ store: reader });

        expect(
            await ilingo.get({
                group: 'app',
                key: 'greeting',
                locale: 'de',
                data: { name: 'Peter' },
            }),
        ).toEqual('Hallo Peter');
    });

    it('preserves sibling keys when setting a new one', async () => {
        const store = new FSStore({ directory: tmpDir });
        await store.set({
            locale: 'en', group: 'app', key: 'first', value: 'A',
        });
        await store.set({
            locale: 'en', group: 'app', key: 'second', value: 'B',
        });

        const written = JSON.parse(
            await readFile(path.join(tmpDir, 'en', 'app.json'), 'utf8'),
        );

        expect(written).toEqual({ first: 'A', second: 'B' });
    });

    it('writes nested keys via dotted access', async () => {
        const store = new FSStore({ directory: tmpDir });
        await store.set({
            locale: 'en',
            group: 'form',
            key: 'nested.deep.key',
            value: 'deeply nested',
        });

        const written = JSON.parse(
            await readFile(path.join(tmpDir, 'en', 'form.json'), 'utf8'),
        );

        expect(written).toEqual({
            nested: { deep: { key: 'deeply nested' } },
        });
    });

    it('honours an explicit writeDirectory separate from read directories', async () => {
        const readDir = path.join(tmpDir, 'read');
        const writeDir = path.join(tmpDir, 'write');

        const store = new FSStore({
            directory: readDir,
            writeDirectory: writeDir,
        });
        await store.set({
            locale: 'en', group: 'app', key: 'k', value: 'v',
        });

        const written = JSON.parse(
            await readFile(path.join(writeDir, 'en', 'app.json'), 'utf8'),
        );
        expect(written).toEqual({ k: 'v' });
    });
});
