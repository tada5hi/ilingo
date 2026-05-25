/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { bench, describe } from 'vitest';
import { makeI18next, makeIlingo } from './setup';

/**
 * Plural selection with `Intl.PluralRules` (ilingo) vs i18next's suffix
 * mechanism. Both libraries cache the rules instance internally, so this
 * primarily measures the form-selection branch + `{{count}}` substitution.
 */
describe('get() — plural lookup', () => {
    const ilingo = makeIlingo();
    const i18n = makeI18next();

    // Pick a non-`one` count so the `other` branch fires — the typical
    // case for product counters / list lengths.
    bench('ilingo.get (plural, count=5)', async () => {
        await ilingo.get({
            group: 'app', 
            key: 'cart.items', 
            count: 5, 
        });
    });

    bench('i18next.t (plural, count=5)', () => {
        i18n.t('app:cart.items', { count: 5 });
    });
});
