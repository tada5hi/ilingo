/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, it, expect } from "vitest";

import {
    isCatalogNode,
    isTranslationsNode,
    isLocaleNode,
    isNamespaceNode,
    isPluralForms,
    isPluralNode,
} from "../../../src";

describe('src/utils/identify.ts', () => {
    describe('isPluralForms', () => {
        it('accepts a CLDR-categorised options object with other', () => {
            expect(isPluralForms({ one: '1', other: 'n' })).toBe(true);
            expect(isPluralForms({ other: 'n' })).toBe(true);
        });

        it('rejects a missing other, a non-CLDR key, or a non-string value', () => {
            expect(isPluralForms({ one: '1' })).toBe(false);
            expect(isPluralForms({ other: 'n', bogus: 'x' })).toBe(false);
            expect(isPluralForms({ other: 1 })).toBe(false);
            expect(isPluralForms({})).toBe(false);
            expect(isPluralForms('nope')).toBe(false);
        });
    });

    describe('isPluralNode', () => {
        it('accepts a { type: "plural", data } node', () => {
            expect(isPluralNode({ type: 'plural', data: { other: 'n' } })).toBe(true);
        });

        it('rejects a wrong tag, missing data, or invalid forms', () => {
            expect(isPluralNode({ type: 'translations', data: { other: 'n' } })).toBe(false);
            expect(isPluralNode({ type: 'plural', data: { one: '1' } })).toBe(false);
            expect(isPluralNode({ other: 'n' })).toBe(false);
            expect(isPluralNode('nope')).toBe(false);
        });
    });

    describe('node guards', () => {
        it('isTranslationsNode', () => {
            expect(isTranslationsNode({ type: 'translations', data: { hi: 'x' } })).toBe(true);
            expect(isTranslationsNode({ type: 'translations', data: 'nope' })).toBe(false);
            expect(isTranslationsNode({ type: 'namespace', name: 'a', data: [] })).toBe(false);
        });

        it('isNamespaceNode', () => {
            expect(isNamespaceNode({ type: 'namespace', name: 'app', data: [] })).toBe(true);
            expect(isNamespaceNode({ type: 'namespace', data: [] })).toBe(false);
            expect(isNamespaceNode({ type: 'namespace', name: 'app', data: {} })).toBe(false);
        });

        it('isLocaleNode', () => {
            expect(isLocaleNode({ type: 'locale', name: 'en', data: [] })).toBe(true);
            expect(isLocaleNode({ type: 'locale', data: [] })).toBe(false);
        });

        it('isCatalogNode', () => {
            expect(isCatalogNode({ type: 'catalog', data: [] })).toBe(true);
            expect(isCatalogNode({ type: 'catalog', data: {} })).toBe(false);
            expect(isCatalogNode({ type: 'locale', name: 'en', data: [] })).toBe(false);
        });
    });
});
