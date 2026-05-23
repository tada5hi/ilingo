/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import { negotiateLocale, parseAcceptLanguage } from '../../../src';

describe('utils/negotiate — negotiateLocale', () => {
    it('returns undefined when either list is empty', () => {
        expect(negotiateLocale([], ['en'])).toBeUndefined();
        expect(negotiateLocale(['en'], [])).toBeUndefined();
        expect(negotiateLocale([], [])).toBeUndefined();
    });

    it('finds an exact match', () => {
        expect(negotiateLocale(['en', 'de'], ['de'])).toEqual('de');
        expect(negotiateLocale(['en', 'pt-BR'], ['pt-BR'])).toEqual('pt-BR');
    });

    it('matches case-insensitively for language and case-sensitively (canonical) for region', () => {
        expect(negotiateLocale(['en-US'], ['EN-us'])).toEqual('en-US');
        expect(negotiateLocale(['PT-br'], ['pt-BR'])).toEqual('PT-br');
    });

    it('honours request priority order', () => {
        expect(negotiateLocale(['en', 'de'], ['de', 'en'])).toEqual('de');
        expect(negotiateLocale(['en', 'de'], ['en', 'de'])).toEqual('en');
    });

    it('matches a requested parent against a supported region — longest-prefix wins', () => {
        // Acceptance from the plan: ['en', 'pt-BR'] + ['pt-PT', 'pt', 'en']
        // pt-PT misses, pt matches pt-BR as a parent prefix.
        expect(negotiateLocale(['en', 'pt-BR'], ['pt-PT', 'pt', 'en'])).toEqual('pt-BR');
    });

    it('walks the requested locale\'s BCP-47 parents', () => {
        // Requested 'pt-PT' → no supported pt-PT; parent 'pt' matches.
        expect(negotiateLocale(['pt'], ['pt-PT'])).toEqual('pt');
        // 'pt-BR-Latn' → 'pt-BR' → 'pt' — find 'pt'.
        expect(negotiateLocale(['pt'], ['pt-BR-Latn'])).toEqual('pt');
    });

    it('returns undefined when no requested locale matches', () => {
        expect(negotiateLocale(['en', 'de'], ['fr', 'es'])).toBeUndefined();
    });

    it('does not let a later (lower-priority) request beat an earlier one', () => {
        // 'fr' is unsupported but listed first; 'en' should still match.
        expect(negotiateLocale(['en', 'de'], ['fr', 'en'])).toEqual('en');
        // 'pt' (parent of supported 'pt-BR') beats 'en' because pt is earlier.
        expect(negotiateLocale(['en', 'pt-BR'], ['pt', 'en'])).toEqual('pt-BR');
    });
});

describe('utils/negotiate — parseAcceptLanguage', () => {
    it('returns an empty array for an empty input', () => {
        expect(parseAcceptLanguage('')).toEqual([]);
    });

    it('parses a single tag', () => {
        expect(parseAcceptLanguage('en-US')).toEqual(['en-US']);
    });

    it('parses comma-separated tags in declared order', () => {
        expect(parseAcceptLanguage('en-US,en,de')).toEqual(['en-US', 'en', 'de']);
    });

    it('sorts by q-value descending', () => {
        expect(parseAcceptLanguage('de;q=0.5,en;q=0.9,fr;q=0.7')).toEqual(['en', 'fr', 'de']);
    });

    it('treats missing q as q=1 (RFC 9110)', () => {
        expect(parseAcceptLanguage('de;q=0.5,en,fr;q=0.7')).toEqual(['en', 'fr', 'de']);
    });

    it('drops the * wildcard', () => {
        expect(parseAcceptLanguage('pt-PT;q=0.7, pt;q=0.5, *;q=0.1'))
            .toEqual(['pt-PT', 'pt']);
    });

    it('preserves declared order for tags with the same q', () => {
        expect(parseAcceptLanguage('en;q=0.5,fr;q=0.5,de;q=0.5'))
            .toEqual(['en', 'fr', 'de']);
    });

    it('tolerates whitespace around tags and parameters', () => {
        // en-US has q=0.9; de has implicit q=1.0, so de wins on sort.
        expect(parseAcceptLanguage('  en-US ; q=0.9 , de ')).toEqual(['de', 'en-US']);
    });
});
