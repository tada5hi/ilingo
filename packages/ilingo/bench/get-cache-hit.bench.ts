/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { bench, describe } from 'vitest';
import { makeI18next, makeIlingo } from './setup';

/**
 * Cache-hit baseline: a plain `get()` for a key that lives in the active
 * locale's first registered store. The dominant cost is dotted-path
 * traversal + (for ilingo) the microtask round-trip from the async port.
 *
 * Headline workload — what every render in a typical app pays per call.
 */
describe('get() — cache hit, simple string leaf', () => {
    const ilingo = makeIlingo();
    const i18n = makeI18next();

    bench('ilingo.get', async () => {
        await ilingo.get({
            group: 'app', 
            key: 'greeting', 
            data: { name: 'Peter' }, 
        });
    });

    bench('i18next.t', () => {
        i18n.t('app:greeting', { name: 'Peter' });
    });
});
