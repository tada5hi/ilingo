/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Ilingo } from 'ilingo';
import { FSStore } from '../../src';

describe('FSStore — dotted namespaces (dotted filenames)', () => {
    let tmpDir: string;

    beforeEach(async () => {
        tmpDir = await mkdtemp(path.join(os.tmpdir(), 'ilingo-fs-dotted-'));
        await mkdir(path.join(tmpDir, 'en'), { recursive: true });
        // A nested/hierarchical namespace `app.nav` maps to a dotted filename.
        await writeFile(
            path.join(tmpDir, 'en', 'app.nav.json'),
            JSON.stringify({ type: 'lines', data: { home: 'Home', back: 'Back' } }),
        );
        // A flat namespace alongside it, with a key-nested group.
        await writeFile(
            path.join(tmpDir, 'en', 'app.json'),
            JSON.stringify({ type: 'lines', data: { greeting: 'Hi', menu: { open: 'Open' } } }),
        );
    });

    afterEach(async () => {
        await rm(tmpDir, { recursive: true, force: true });
    });

    it('resolves a dotted namespace from a dotted filename', async () => {
        const ilingo = new Ilingo({ store: new FSStore({ directory: tmpDir }) });

        expect(await ilingo.get({ namespace: 'app.nav', key: 'home', locale: 'en' }))
            .toEqual('Home');
        expect(await ilingo.get({ namespace: 'app.nav', key: 'back', locale: 'en' }))
            .toEqual('Back');
    });

    it('keeps the flat namespace and its key-nested group separate from the dotted one', async () => {
        const ilingo = new Ilingo({ store: new FSStore({ directory: tmpDir }) });

        expect(await ilingo.get({ namespace: 'app', key: 'greeting', locale: 'en' }))
            .toEqual('Hi');
        expect(await ilingo.get({ namespace: 'app', key: 'menu.open', locale: 'en' }))
            .toEqual('Open');
        // `app.nav` is its own namespace — NOT reachable as a key under `app`.
        expect(await ilingo.get({ namespace: 'app', key: 'nav.home', locale: 'en' }))
            .toBeUndefined();
    });

    it('persists a dotted namespace back to its dotted filename and round-trips', async () => {
        const writer = new FSStore({ directory: tmpDir });
        await writer.set({
            locale: 'en', namespace: 'app.footer', key: 'copyright', value: '© 2026',
        });

        const written = JSON.parse(
            await readFile(path.join(tmpDir, 'en', 'app.footer.json'), 'utf8'),
        );
        expect(written).toEqual({ type: 'lines', data: { copyright: '© 2026' } });

        const reader = new Ilingo({ store: new FSStore({ directory: tmpDir }) });
        expect(await reader.get({ namespace: 'app.footer', key: 'copyright', locale: 'en' }))
            .toEqual('© 2026');
    });
});
