/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import { Ilingo, MemoryStore, defineCatalog } from '../../src';
import { toCatalog } from '../helpers/catalog';

describe('Custom formatters (#906)', () => {
    it('registerFormatter() exposes a custom modifier inside templates', async () => {
        const ilingo = new Ilingo({
            store: new MemoryStore({
                data: toCatalog({ en: { app: { shout: 'Hi {{name, upper}}!' } } }),
            }),
        });

        ilingo.registerFormatter('upper', (value, _opts, locale) =>
            String(value).toLocaleUpperCase(locale));

        expect(
            await ilingo.get({ namespace: 'app', key: 'shout', data: { name: 'peter' } }),
        ).toEqual('Hi PETER!');
    });

    it('Config.formatters registers at construction time', async () => {
        const ilingo = new Ilingo({
            store: new MemoryStore({
                data: toCatalog({ en: { app: { shout: 'Hi {{name, upper}}!' } } }),
            }),
            formatters: {
                upper: (value, _opts, locale) =>
                    String(value).toLocaleUpperCase(locale),
            },
        });

        expect(
            await ilingo.get({ namespace: 'app', key: 'shout', data: { name: 'peter' } }),
        ).toEqual('Hi PETER!');
    });

    it('Config.formatters can override a built-in formatter', async () => {
        const ilingo = new Ilingo({
            store: new MemoryStore({
                data: toCatalog({ en: { app: { owe: 'You owe {{amount, number}}' } } }),
            }),
            formatters: {
                // Replace the built-in `number` with one that always prefixes 'NUM:'.
                number: (value) => `NUM:${value}`,
            },
        });

        expect(
            await ilingo.get({ namespace: 'app', key: 'owe', data: { amount: 99 } }),
        ).toEqual('You owe NUM:99');
    });

    it('clone({ formatters }) applies the override formatters to the shared registry', async () => {
        // Regression for PR #918 review: clone() previously accepted
        // overrides.formatters via Partial<Config> but didn't apply them at
        // runtime — silent no-op.
        const parent = new Ilingo({ store: new MemoryStore({ data: defineCatalog([]) }) });
        const child = parent.clone({
            store: new MemoryStore({
                data: toCatalog({ en: { app: { hi: 'hi {{name, upper}}' } } }),
            }),
            formatters: {
                upper: (value, _opts, locale) =>
                    String(value).toLocaleUpperCase(locale),
            },
        });

        expect(
            await child.get({ namespace: 'app', key: 'hi', data: { name: 'peter' } }),
        ).toEqual('hi PETER');
        // Shared registry: the parent now sees the formatter too.
        expect(parent.formatters.has('upper')).toBe(true);
    });

    it('clone() shares the formatter registry — custom formatters work in the child', async () => {
        const parent = new Ilingo({
            store: new MemoryStore({ data: defineCatalog([]) }),
            formatters: {
                upper: (value, _opts, locale) =>
                    String(value).toLocaleUpperCase(locale),
            },
        });
        const child = parent.clone({
            store: new MemoryStore({
                data: toCatalog({ en: { scoped: { hi: 'hi {{name, upper}}' } } }),
            }),
        });
        expect(
            await child.get({ namespace: 'scoped', key: 'hi', data: { name: 'peter' } }),
        ).toEqual('hi PETER');
    });
});
