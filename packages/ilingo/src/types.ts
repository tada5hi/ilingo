/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export type PluralCategory = 'zero' | 'one' | 'two' | 'few' | 'many' | 'other';

export type PluralLeaf = { other: string } &
    Partial<Record<Exclude<PluralCategory, 'other'>, string>>;

export type Leaf = string | PluralLeaf;

export type ValueOrNestedValue<T> = {
    [key: string]: ValueOrNestedValue<T> | T
};

// default: Record<group, Record<locale, Lines>>
export type LinesRecord = ValueOrNestedValue<Leaf>;
// default: Record<group, Lines>
export type GroupsRecord = Record<string, LinesRecord>;
// default: Record<locale, Groups>
export type LocalesRecord = Record<string, GroupsRecord>;

export type DotKey = `${string}.${string}`;

export type Data = Record<string, string | number>;

export type GetContext = {
    data?: Data,
    locale?: string,
    group: string,
    key: string,
    count?: number,
};

export type MissingKeyContext = GetContext & {
    /**
     * The last locale that was tried — the end of the resolved fallback chain.
     */
    resolvedLocale?: string,
};

export type MissingKeyHandler = (context: MissingKeyContext) => string | undefined | void;

export type FallbackResolver = (locale: string) => string[];

/**
 * - `string`            — single fallback locale, applied after the requested one.
 * - `string[]`          — ordered fallback locales (empty array suppresses BCP-47 parents).
 * - `FallbackResolver`  — computed per call.
 * - `false`             — disable fallback entirely; the chain is just `[locale]`
 *                          (the default locale is NOT appended).
 */
export type Fallback = string | string[] | FallbackResolver | false;
