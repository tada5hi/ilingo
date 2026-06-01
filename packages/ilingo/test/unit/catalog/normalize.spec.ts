/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    defineCatalog,
    defineLines,
    defineLocale,
    defineNamespace,
    definePlural,
    normalizeCatalog,
    normalizeNamespaceBody,
} from '../../../src';

// Runs first: the mis-shape warning dedupes per call-site at module scope,
// so these assertions must observe the warning before any later test in this
// file consumes the dedupe.
describe('normalize — dev warning on mis-shaped input', () => {
    let warn: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    });

    afterEach(() => {
        warn.mockRestore();
    });

    it('warns and returns {} for a non-lines namespace body', () => {
        // @ts-expect-error — exercising the runtime guard with a plain object
        expect(normalizeNamespaceBody({ submit: 'Submit' })).toEqual({});
        expect(warn).toHaveBeenCalledTimes(1);
        expect(warn.mock.calls[0][0]).toContain('namespace body');
    });

    it('warns and skips a non-locale node in a catalog', () => {
        // @ts-expect-error — a plain locale object is no longer valid input
        expect(normalizeCatalog([{ en: { app: { hi: 'Hi' } } }])).toEqual({});
        expect(warn).toHaveBeenCalledTimes(1);
        expect(warn.mock.calls[0][0]).toContain('catalog locale');
    });
});

describe('normalizeCatalog', () => {
    it('reduces a catalog node to the internal Locales shape', () => {
        const out = normalizeCatalog(defineCatalog([
            defineLocale('en', [
                defineNamespace('app', [defineLines({ greeting: 'Hi' })]),
            ]),
        ]));

        expect(out).toEqual({ en: { app: { greeting: 'Hi' } } });
    });

    it('accepts a bare array of locale nodes', () => {
        const out = normalizeCatalog([
            defineLocale('en', [defineNamespace('app', [defineLines({ a: '1' })])]),
            defineLocale('de', [defineNamespace('app', [defineLines({ a: 'eins' })])]),
        ]);

        expect(out).toEqual({ en: { app: { a: '1' } }, de: { app: { a: 'eins' } } });
    });

    it('accepts a single locale node', () => {
        const out = normalizeCatalog(
            defineLocale('en', [defineNamespace('app', [defineLines({ a: '1' })])]),
        );

        expect(out).toEqual({ en: { app: { a: '1' } } });
    });

    it('extends the dotted NAMESPACE for nested namespace nodes', () => {
        const out = normalizeCatalog([
            defineLocale('en', [
                defineNamespace('app', [
                    defineLines({ greeting: 'Hi' }),
                    defineNamespace('nav', [defineLines({ home: 'Home' })]),
                ]),
            ]),
        ]);

        // `app ▸ nav` → namespace 'app.nav', and `app` keeps its own lines.
        expect(out).toEqual({
            en: {
                app: { greeting: 'Hi' },
                'app.nav': { home: 'Home' },
            },
        });
    });

    it('extends the dotted KEY for nested objects inside a lines node', () => {
        const out = normalizeCatalog([
            defineLocale('en', [
                defineNamespace('app', [
                    defineLines({ nav: { home: 'Home', settings: 'Settings' } }),
                ]),
            ]),
        ]);

        // nested object inside lines → key path, NOT a namespace.
        expect(out).toEqual({
            en: { app: { nav: { home: 'Home', settings: 'Settings' } } },
        });
    });

    it('deep-merges sibling lines nodes within one namespace', () => {
        const out = normalizeCatalog([
            defineLocale('en', [
                defineNamespace('app', [
                    defineLines({ a: '1', group: { x: 'X' } }),
                    defineLines({ b: '2', group: { y: 'Y' } }),
                ]),
            ]),
        ]);

        expect(out).toEqual({
            en: { app: { a: '1', b: '2', group: { x: 'X', y: 'Y' } } },
        });
    });

    it('keeps a plural node intact as a leaf value', () => {
        const out = normalizeCatalog([
            defineLocale('en', [
                defineNamespace('cart', [
                    defineLines({ items: definePlural({ one: '1', other: 'n' }) }),
                ]),
            ]),
        ]);

        expect(out).toEqual({
            en: { cart: { items: { type: 'plural', data: { one: '1', other: 'n' } } } },
        });
    });

    it('routes lines placed directly under a locale to the default namespace', () => {
        const out = normalizeCatalog([
            defineLocale('en', [defineLines({ hello: 'Hi' })]),
        ]);

        expect(out).toEqual({ en: { '': { hello: 'Hi' } } });
    });

    it('does not create an entry for a namespace with only sub-namespaces', () => {
        const out = normalizeCatalog([
            defineLocale('en', [
                defineNamespace('app', [
                    defineNamespace('nav', [defineLines({ home: 'Home' })]),
                ]),
            ]),
        ]);

        expect(out).toEqual({ en: { 'app.nav': { home: 'Home' } } });
        expect(out.en).not.toHaveProperty('app');
    });
});

describe('normalizeNamespaceBody', () => {
    it('reduces a lines node to its data', () => {
        expect(normalizeNamespaceBody(defineLines({ a: '1', nested: { b: '2' } })))
            .toEqual({ a: '1', nested: { b: '2' } });
    });

    it('returns an empty record for a non-lines body', () => {
        // @ts-expect-error — exercising the defensive runtime guard
        expect(normalizeNamespaceBody({ foo: 'bar' })).toEqual({});
    });
});
