/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export type PluralCategory = 'zero' | 'one' | 'two' | 'few' | 'many' | 'other';

/**
 * CLDR-categorised translation for a single key.
 *
 * Prefer the explicit form below (`PluralLeafExplicit`) — wrap your plural
 * forms in `{ "@plural": { ... } }` — to avoid ambiguity with regular
 * namespaces. Structural detection (recognising a bare `{ one, other }`
 * object as plural) is supported for backward compatibility but is
 * unambiguous only as long as no sibling key happens to be a CLDR
 * category name.
 */
export type PluralLeaf = { other: string } &
    Partial<Record<Exclude<PluralCategory, 'other'>, string>>;

/**
 * Recommended explicit form. Unambiguous regardless of sibling key names,
 * since detection keys off the `@plural` discriminator.
 */
export type PluralLeafExplicit = { '@plural': PluralLeaf };

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

export type MissingKeyHandler = (context: MissingKeyContext) => string | undefined;

export type FallbackResolver = (locale: string) => string[];

/**
 * - `string`            — single fallback locale, applied after the requested one.
 * - `string[]`          — ordered fallback locales. An *empty* array opts out
 *                          of fallback entirely (chain is just `[locale]`).
 * - `FallbackResolver`  — computed per call. Returning `[]` also opts out for
 *                          that call.
 * - `false`             — disable fallback entirely; equivalent to `[]` but
 *                          type-safe to spell out the intent.
 *
 * If none of the explicit forms above are given (i.e. `undefined`), the chain
 * is derived from BCP-47 parents of the requested locale and terminates at
 * the default locale.
 */
export type Fallback = string | string[] | FallbackResolver | false;
