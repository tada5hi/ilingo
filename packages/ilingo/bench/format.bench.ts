/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { bench, describe } from 'vitest';
import { makeI18next, makeIlingo } from './setup';

/**
 * Template + one `Intl.NumberFormat` modifier. ilingo dispatches through
 * its `FormatterRegistry` (which memoises the underlying `Intl.NumberFormat`
 * instance per `(locale, options)` pair); i18next does the same internally.
 * The bench measures the hot path after both caches have warmed.
 */
describe('format() — template + number formatter', () => {
    const ilingo = makeIlingo();
    const i18n = makeI18next();

    bench('ilingo.get (number(currency=EUR))', async () => {
        await ilingo.get({
            namespace: 'app',
            key: 'cart.total',
            data: { amount: 42.5 },
        });
    });

    bench('i18next.t (number(currency=EUR))', () => {
        // i18next's equivalent is the `format()` interpolation option:
        //   "Total: {{amount, currency}}" — but we configured the catalog
        // with our own `{{amount, number(currency=EUR)}}` syntax, so for
        // a fair comparison we run i18next with a custom format function.
        i18n.t('app:cart.total', {
            amount: 42.5,
            // i18next built-in: pass a formatter function for the
            // `amount` placeholder. Memoised by i18next internally.
            formatParams: { amount: { currency: 'EUR' } },
        });
    });
});
