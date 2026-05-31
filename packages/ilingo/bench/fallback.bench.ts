/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import i18next from 'i18next';
import { bench, describe } from 'vitest';
import { Ilingo, MemoryStore } from '../src';
import { catalog } from './setup';

/**
 * Cache-miss + 3-deep fallback chain. The key is intentionally missing
 * from the requested locale, so the orchestrator walks down the fallback
 * chain before finding the hit in the default locale.
 *
 * Worst-case path for the cache-hit benchmark — every lookup pays this
 * when a locale is partially translated.
 */
describe('get() — cache miss with 3-deep fallback', () => {
    // Construct an ilingo that requests `pt-BR` -> `pt` -> `en`. Only `en`
    // has the key, so the chain is fully walked.
    const ilingo = new Ilingo({
        store: new MemoryStore({
            data: {
                'pt-BR': { app: {} },
                pt: { app: {} },
                en: catalog.en,
            },
        }),
        locale: 'pt-BR',
    });

    const i18n = i18next.createInstance();
    i18n.init({
        lng: 'pt-BR',
        // i18next walks fallback in order; `en` is the terminal entry.
        fallbackLng: ['pt', 'en'],
        ns: ['app', 'form'],
        defaultNS: 'app',
        resources: {
            'pt-BR': { app: {}, form: {} },
            pt: { app: {}, form: {} },
            en: {
                app: { greeting: 'Hi {{name}}' },
                form: {},
            },
        },
        initImmediate: false,
        interpolation: { escapeValue: false },
    });

    bench('ilingo.get (3-deep fallback)', async () => {
        await ilingo.get({
            namespace: 'app', 
            key: 'greeting', 
            data: { name: 'Peter' }, 
        });
    });

    bench('i18next.t (3-deep fallback)', () => {
        i18n.t('app:greeting', { name: 'Peter' });
    });
});
