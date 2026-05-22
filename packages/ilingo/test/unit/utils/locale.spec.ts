/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import { bcp47Parents, resolveLocaleChain } from '../../../src/utils/locale';

describe('utils/locale', () => {
    it('derives BCP-47 parents from most specific to most generic', () => {
        expect(bcp47Parents('pt-BR-Latn')).toEqual(['pt-BR', 'pt']);
        expect(bcp47Parents('pt-BR')).toEqual(['pt']);
        expect(bcp47Parents('pt')).toEqual([]);
    });

    it('falls back to BCP-47 parents when no explicit fallback is configured', () => {
        expect(resolveLocaleChain('pt-BR', undefined, 'en')).toEqual([
            'pt-BR', 'pt', 'en',
        ]);
    });

    it('accepts a single fallback string', () => {
        expect(resolveLocaleChain('pt-BR', 'es', 'en')).toEqual([
            'pt-BR', 'es', 'en',
        ]);
    });

    it('accepts a fallback array in declared order', () => {
        expect(resolveLocaleChain('pt-BR', ['es', 'fr'], 'en')).toEqual([
            'pt-BR', 'es', 'fr', 'en',
        ]);
    });

    it('accepts a fallback resolver function', () => {
        expect(
            resolveLocaleChain(
                'pt-BR',
                (locale) => [locale.toLowerCase()],
                'en',
            ),
        ).toEqual(['pt-BR', 'pt-br', 'en']);
    });

    it('deduplicates the chain', () => {
        expect(resolveLocaleChain('en', undefined, 'en')).toEqual(['en']);
        expect(resolveLocaleChain('en', 'en', 'en')).toEqual(['en']);
    });
});
