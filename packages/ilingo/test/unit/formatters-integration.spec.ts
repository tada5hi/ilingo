/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Ilingo, MemoryStore } from '../../src';

describe('Ilingo — Intl formatters (#896)', () => {
    let warn: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    });

    afterEach(() => {
        warn.mockRestore();
    });

    it('formats a currency value in the resolved locale', async () => {
        const ilingo = new Ilingo({
            store: new MemoryStore({
                data: {
                    en: { app: { owe: 'You owe {{amount, number(style=currency, currency=EUR)}}' } },
                    de: { app: { owe: 'Sie schulden {{amount, number(style=currency, currency=EUR)}}' } },
                },
            }),
        });

        expect(
            await ilingo.get({ group: 'app', key: 'owe', data: { amount: 99 } }),
        ).toMatch(/€99/);

        expect(
            await ilingo.get({ group: 'app', key: 'owe', data: { amount: 99 }, locale: 'de' }),
        ).toMatch(/99,00\s?€/);
    });

    it('formats a date in the resolved locale', async () => {
        const ilingo = new Ilingo({
            store: new MemoryStore({
                data: {
                    en: { app: { signed: 'Signed {{date, date(dateStyle=medium, timeZone=UTC)}}' } },
                },
            }),
        });

        expect(
            await ilingo.get({
                group: 'app',
                key: 'signed',
                data: { date: '2026-05-22T12:00:00Z' },
            }),
        ).toEqual('Signed May 22, 2026');
    });

    it('formats a list in the resolved locale', async () => {
        const ilingo = new Ilingo({
            store: new MemoryStore({
                data: {
                    en: { app: { invited: '{{people, list(style=long, type=conjunction)}}' } },
                },
            }),
        });

        expect(
            await ilingo.get({
                group: 'app',
                key: 'invited',
                data: { people: ['Alice', 'Bob', 'Carol'] },
            }),
        ).toEqual('Alice, Bob, and Carol');
    });

    it('locale comes from the *resolved* locale, not the requested one', async () => {
        // Request pt-BR → falls back to de via explicit fallback. Number
        // formatting must use 'de' (the hit locale), not 'pt-BR'.
        const ilingo = new Ilingo({
            fallback: 'de',
            store: new MemoryStore({
                data: {
                    de: { app: { owe: '{{amount, number(style=decimal)}}' } },
                },
            }),
        });

        expect(
            await ilingo.get({ group: 'app', key: 'owe', data: { amount: 1234.5 }, locale: 'pt-BR' }),
        ).toEqual('1.234,5');
    });

    it('falls back to raw value on an unknown modifier and dev-warns once', async () => {
        const ilingo = new Ilingo({
            store: new MemoryStore({
                data: { en: { app: { greet: '{{name, weird}}' } } },
            }),
        });

        expect(await ilingo.get({ group: 'app', key: 'greet', data: { name: 'Peter' } }))
            .toEqual('Peter');
        // Same template again — should not warn a second time.
        await ilingo.get({ group: 'app', key: 'greet', data: { name: 'Peter' } });

        expect(warn).toHaveBeenCalledTimes(1);
        expect(warn.mock.calls[0][0]).toContain('weird');
    });

    it('formatter cache lives on the instance — repeated renders do not reallocate Intl', async () => {
        const ilingo = new Ilingo({
            store: new MemoryStore({
                data: { en: { app: { owe: '{{amount, number(style=decimal)}}' } } },
            }),
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const cacheSize = () => (ilingo.formatters as any).cache.size;

        for (let i = 0; i < 5; i++) {
            await ilingo.get({ group: 'app', key: 'owe', data: { amount: i } });
        }

        // One `Intl.NumberFormat` entry total — same locale, same options.
        expect(cacheSize()).toEqual(1);
    });

    it('count auto-injects into data and renders through a formatter', async () => {
        const ilingo = new Ilingo({
            store: new MemoryStore({
                data: {
                    en: {
                        cart: {
                            items: {
                                '@plural': {
                                    one: '{{count, number}} item',
                                    other: '{{count, number}} items',
                                },
                            },
                        },
                    },
                },
            }),
        });

        expect(await ilingo.get({ group: 'cart', key: 'items', count: 1 })).toEqual('1 item');
        expect(await ilingo.get({ group: 'cart', key: 'items', count: 1234 })).toEqual('1,234 items');
    });
});
