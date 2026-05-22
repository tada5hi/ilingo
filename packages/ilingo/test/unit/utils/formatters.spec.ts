/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import {
    FormatterRegistry,
    parseFormatterOptions,
    parseModifier,
    template,
} from '../../../src';

describe('utils/formatters — option parser', () => {
    it('returns {} on empty input', () => {
        expect(parseFormatterOptions(undefined)).toEqual({});
        expect(parseFormatterOptions('')).toEqual({});
    });

    it('parses key=value pairs and coerces numbers + booleans', () => {
        expect(parseFormatterOptions('currency=EUR, style=currency, minimumFractionDigits=2')).toEqual({
            currency: 'EUR',
            style: 'currency',
            minimumFractionDigits: 2,
        });
        expect(parseFormatterOptions('useGrouping=true, narrow=false')).toEqual({
            useGrouping: true,
            narrow: false,
        });
        expect(parseFormatterOptions('count=-3.14')).toEqual({ count: -3.14 });
    });

    it('skips malformed pairs', () => {
        expect(parseFormatterOptions('key=, =value, ok=ok')).toEqual({ ok: 'ok' });
    });
});

describe('utils/formatters — modifier parser', () => {
    it('returns undefined on empty input', () => {
        expect(parseModifier('')).toBeUndefined();
        expect(parseModifier('   ')).toBeUndefined();
    });

    it('parses bare names', () => {
        expect(parseModifier('number')).toEqual({ name: 'number', options: undefined });
    });

    it('parses name(opts)', () => {
        expect(parseModifier('number(currency=EUR)')).toEqual({
            name: 'number',
            options: 'currency=EUR',
        });
    });

    it('rejects unbalanced parens', () => {
        expect(parseModifier('number(currency=EUR')).toBeUndefined();
        expect(parseModifier('number)')).toBeUndefined();
    });

    it('rejects extra trailing parens and nested parens', () => {
        // Regression for PR review: `endsWith(')')` previously allowed these.
        expect(parseModifier('number(currency=EUR))')).toBeUndefined();
        expect(parseModifier('number(group(nested))')).toBeUndefined();
    });
});

describe('utils/formatters — built-in registry', () => {
    it('formats numbers via Intl.NumberFormat', () => {
        const reg = new FormatterRegistry();
        const fmt = reg.get('number')!;

        expect(fmt(1234.5, { style: 'decimal' }, 'en')).toEqual('1,234.5');
        expect(fmt(1234.5, { style: 'decimal' }, 'de')).toEqual('1.234,5');
        expect(fmt(99, { style: 'currency', currency: 'EUR' }, 'en')).toMatch(/€99/);
    });

    it('formats dates via Intl.DateTimeFormat', () => {
        const reg = new FormatterRegistry();
        const fmt = reg.get('date')!;
        const d = new Date('2026-05-22T12:00:00Z');

        expect(fmt(d, { dateStyle: 'medium', timeZone: 'UTC' }, 'en')).toEqual('May 22, 2026');
        // ISO string accepted too:
        expect(fmt('2026-05-22T12:00:00Z', { dateStyle: 'short', timeZone: 'UTC' }, 'en')).toMatch(/26/);
    });

    it('formats lists via Intl.ListFormat', () => {
        const reg = new FormatterRegistry();
        const fmt = reg.get('list')!;

        expect(fmt(['Alice', 'Bob', 'Carol'], { style: 'long', type: 'conjunction' }, 'en'))
            .toEqual('Alice, Bob, and Carol');
        expect(fmt(['Alice', 'Bob'], { type: 'disjunction' }, 'en')).toEqual('Alice or Bob');
    });

    it('caches by sorted option keys — re-ordered options hit the same entry', () => {
        const reg = new FormatterRegistry();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const cacheSize = () => (reg as any).cache.size;

        reg.get('number')!(1, { style: 'currency', currency: 'EUR' }, 'en');
        reg.get('number')!(1, { currency: 'EUR', style: 'currency' }, 'en');

        expect(cacheSize()).toEqual(1);
    });

    it('falls back to String(value) when Intl.* construction throws (invalid options)', () => {
        const reg = new FormatterRegistry();
        // `currency=invalid` causes new Intl.NumberFormat to throw RangeError.
        expect(reg.get('number')!(99, { style: 'currency', currency: 'invalid' }, 'en'))
            .toEqual('99');
    });

    it('memoises Intl instances per (locale, options)', () => {
        // Count distinct Intl.NumberFormat instances created by inspecting
        // the registry's cache directly rather than spying on the global
        // constructor (spying on `new`-able natives is brittle).
        const reg = new FormatterRegistry();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const cacheSize = () => (reg as any).cache.size;

        reg.get('number')!(1, { style: 'decimal' }, 'en');
        reg.get('number')!(2, { style: 'decimal' }, 'en');
        reg.get('number')!(3, { style: 'decimal' }, 'en');
        expect(cacheSize()).toEqual(1);

        // Different options → new entry.
        reg.get('number')!(1, { style: 'percent' }, 'en');
        expect(cacheSize()).toEqual(2);

        // Different locale → new entry.
        reg.get('number')!(1, { style: 'percent' }, 'de');
        expect(cacheSize()).toEqual(3);
    });

    it('falls back to String(value) on non-numeric input to "number"', () => {
        const reg = new FormatterRegistry();
        expect(reg.get('number')!('nope', {}, 'en')).toEqual('nope');
        expect(reg.get('number')!(NaN, {}, 'en')).toEqual('NaN');
    });

    it('falls back to String(value) on non-date input to "date"', () => {
        const reg = new FormatterRegistry();
        expect(reg.get('date')!({}, {}, 'en')).toEqual('[object Object]');
        expect(reg.get('date')!('not-a-date', {}, 'en')).toEqual('not-a-date');
    });

    it('falls back to String(value) on non-array input to "list"', () => {
        const reg = new FormatterRegistry();
        expect(reg.get('list')!('Alice', {}, 'en')).toEqual('Alice');
    });
});

describe('utils/template — modifier dispatch', () => {
    it('passes raw value through when no formatter context is provided', () => {
        expect(template('You owe {{amount, number(currency=EUR)}}', { amount: 99 }))
            .toEqual('You owe 99');
    });

    it('applies the named formatter when a context is provided', () => {
        const formatters = new FormatterRegistry();
        const out = template(
            'You owe {{amount, number(currency=EUR, style=currency)}}',
            { amount: 99 },
            { locale: 'en', formatters },
        );
        expect(out).toMatch(/€99/);
    });

    it('respects commas inside formatter option lists', () => {
        const formatters = new FormatterRegistry();
        const out = template(
            'Invited: {{people, list(style=long, type=conjunction)}}',
            { people: ['Alice', 'Bob', 'Carol'] },
            { locale: 'en', formatters },
        );
        expect(out).toEqual('Invited: Alice, Bob, and Carol');
    });

    it('leaves the placeholder intact when the data key is missing', () => {
        const formatters = new FormatterRegistry();
        const out = template('Hi {{name, number}}!', {}, { locale: 'en', formatters });
        expect(out).toEqual('Hi {{name, number}}!');
    });

    it('falls back to String(value) on an unknown modifier and reports it', () => {
        const formatters = new FormatterRegistry();
        const reported: string[] = [];
        const out = template(
            'Test {{value, weird(opt=1)}}',
            { value: 42 },
            {
                locale: 'en',
                formatters,
                onUnknownFormatter: (name) => reported.push(name),
            },
        );
        expect(out).toEqual('Test 42');
        expect(reported).toEqual(['weird']);
    });

    it('falls back to String(value) on a malformed modifier expression', () => {
        const formatters = new FormatterRegistry();
        const out = template(
            'Test {{value, number(unbalanced}}',
            { value: 42 },
            { locale: 'en', formatters },
        );
        expect(out).toEqual('Test 42');
    });

    it('preserves the legacy 3rd-arg-as-RegExp signature for backward compat', () => {
        // Pre-formatter callers may have passed a custom delimiter regex.
        // The new modifier dispatch is disabled in that case, but the
        // signature must still work.
        const out = template('Hi <name>!', { name: 'Peter' }, /<(\w+)>/g);
        expect(out).toEqual('Hi Peter!');
    });
});

