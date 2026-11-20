/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    Ilingo,
    MemoryStore,
    defineCatalog,
    defineLocale,
    defineNamespace,
    defineTranslations,
} from 'ilingo';
import { describe, expect, it } from 'vitest';
import { createApp } from 'vue';
import { applyInstallInput, injectIlingo, install } from '../../src';

describe('applyInstallInput', () => {
    it('returns the provided instance when called without input after install', async () => {
        const app = createApp({});
        const ilingo = new Ilingo();
        install(app, ilingo);

        const instance = applyInstallInput(app);
        expect(instance).toBe(ilingo);

        // A store registered on the returned instance (what the validation
        // packages do) must be visible through the injected instance.
        instance.registerStore(new MemoryStore({
            data: defineCatalog([
                defineLocale('en', [
                    defineNamespace('app', [defineTranslations({ hi: 'Hello' })]),
                ]),
            ]),
        }));

        expect(await injectIlingo(app).get({ namespace: 'app', key: 'hi' })).toEqual('Hello');
    });

    it('creates and provides an empty instance when nothing is installed yet', () => {
        const app = createApp({});

        const instance = applyInstallInput(app);
        expect(injectIlingo(app)).toBe(instance);
    });
});
