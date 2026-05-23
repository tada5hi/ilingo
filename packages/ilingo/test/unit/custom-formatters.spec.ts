/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import { Ilingo, MemoryStore } from '../../src';

describe('Custom formatters (#906)', () => {
    it('registerFormatter() exposes a custom modifier inside templates', async () => {
        const ilingo = new Ilingo({
            store: new MemoryStore({
                data: { en: { app: { shout: 'Hi {{name, upper}}!' } } },
            }),
        });

        ilingo.registerFormatter('upper', (value, _opts, locale) =>
            String(value).toLocaleUpperCase(locale));

        expect(
            await ilingo.get({ group: 'app', key: 'shout', data: { name: 'peter' } }),
        ).toEqual('Hi PETER!');
    });

    it('Config.formatters registers at construction time', async () => {
        const ilingo = new Ilingo({
            store: new MemoryStore({
                data: { en: { app: { shout: 'Hi {{name, upper}}!' } } },
            }),
            formatters: {
                upper: (value, _opts, locale) =>
                    String(value).toLocaleUpperCase(locale),
            },
        });

        expect(
            await ilingo.get({ group: 'app', key: 'shout', data: { name: 'peter' } }),
        ).toEqual('Hi PETER!');
    });

    it('Config.formatters can override a built-in formatter', async () => {
        const ilingo = new Ilingo({
            store: new MemoryStore({
                data: { en: { app: { owe: 'You owe {{amount, number}}' } } },
            }),
            formatters: {
                // Replace the built-in `number` with one that always prefixes 'NUM:'.
                number: (value) => `NUM:${value}`,
            },
        });

        expect(
            await ilingo.get({ group: 'app', key: 'owe', data: { amount: 99 } }),
        ).toEqual('You owe NUM:99');
    });

    it('clone() shares the formatter registry — custom formatters work in the child', async () => {
        const parent = new Ilingo({
            store: new MemoryStore({ data: {} }),
            formatters: {
                upper: (value, _opts, locale) =>
                    String(value).toLocaleUpperCase(locale),
            },
        });
        const child = parent.clone({
            store: new MemoryStore({
                data: { en: { scoped: { hi: 'hi {{name, upper}}' } } },
            }),
        });
        expect(
            await child.get({ group: 'scoped', key: 'hi', data: { name: 'peter' } }),
        ).toEqual('hi PETER');
    });
});
