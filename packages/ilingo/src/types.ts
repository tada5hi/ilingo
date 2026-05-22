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

// ─── Generic catalog navigation ──────────────────────────────────────────────
//
// When `Ilingo` is parameterised with a concrete catalog shape, these helpers
// expose the legal `(group, key)` pairs and detect plural-shaped leaves so the
// compiler can refuse typos and require `count` where the leaf demands it.
//
// All of these collapse to `string` (group / key) and `false` (plural) when
// `C` is the default `LocalesRecord`, so existing callers keep their unsafe
// but-loose typing without surprise.

/**
 * Pick any locale's group map from the catalog. All locales SHOULD share the
 * same shape; if they diverge, this is the union of all per-locale shapes,
 * which is the safest default for inference.
 */
export type AnyGroups<C extends LocalesRecord> = C[keyof C];

/**
 * Top-level group names declared by the catalog.
 */
export type Groups<C extends LocalesRecord> = keyof AnyGroups<C> & string;

/**
 * Walk a dotted path through a typed object and return the leaf value.
 * Returns `never` if the path doesn't exist in the type.
 */
export type LeafAt<T, K extends string> =    K extends `${infer Head}.${infer Tail}` ?
    Head extends keyof T ?
        LeafAt<T[Head], Tail> :
        never :
    K extends keyof T ?
        T[K] :
        never;

/**
 * Enumerate all dotted leaf paths within a typed object. Stops descending at
 * `string` leaves and at plural leaves (structural or explicit), so a key
 * like `cart.items` resolves to the plural leaf and not into its inner
 * `one` / `other`.
 *
 * Open shapes (those with a `string` index signature like the default
 * `LinesRecord`) short-circuit to plain `string` — there are no concrete
 * keys to enumerate, so any string is acceptable.
 */
export type DottedPaths<T> = string extends keyof T ? string :
    T extends string ? never :
        T extends PluralLeaf | PluralLeafExplicit ? never :
            T extends Record<string, unknown> ?
                {
                    [K in keyof T & string]:
                    T[K] extends string | PluralLeaf | PluralLeafExplicit ?
                        K :
                        T[K] extends Record<string, unknown> ?
                            // Only emit dotted leaf paths — never the bare
                            // intermediate namespace key (which would type-
                            // check but always miss at runtime).
                            `${K}.${DottedPaths<T[K]>}` :
                            never;
                }[keyof T & string] :
                never;

/**
 * Legal dotted keys within a specific group of the catalog.
 */
export type Key<C extends LocalesRecord, G extends Groups<C>> =    AnyGroups<C>[G] extends infer T ?
    DottedPaths<T> extends infer P ?
        P extends string ? P : string :
        string :
    string;

/**
 * `true` when the leaf at `(G, K)` is a plural shape (either structural or
 * explicit `@plural`-wrapped) in *any* locale. Used to make `count` required
 * at the type level for plural keys.
 *
 * `LeafAt<...>` for diverging locales returns a union like
 * `string | PluralLeaf`. A naked `extends PluralLeaf | PluralLeafExplicit`
 * collapses that to `false`, which would let `count` slip through as
 * optional. The `Extract<...>` form treats the key as plural when *any*
 * branch of the union is a plural shape — the safer default, since the
 * locale that's plural-shaped would otherwise silently fall back to its
 * `other` form on every call.
 *
 * The `[X] extends [never]` wrapping disables the distributive-conditional
 * behaviour so `never` (no plural anywhere) is detected directly.
 */
// Open shapes (default LocalesRecord) have a `string` index signature at
// the group level; their leaf type union always includes `PluralLeaf`,
// which would make every call site require `count`. Short-circuit to
// false there — only concrete catalogs participate in plural inference.
export type IsPluralKey<
    C extends LocalesRecord,
    G extends Groups<C>,
    K extends string,
> = string extends keyof AnyGroups<C>[G] ?
    false :
    [Extract<LeafAt<AnyGroups<C>[G], K>, PluralLeaf | PluralLeafExplicit>] extends [never] ?
        false :
        true;

/**
 * The full `ctx` argument to `Ilingo.get()` when parameterised with a
 * catalog. Defaults to today's loose `GetContext` when `C` is `LocalesRecord`.
 *
 * If the leaf at `(G, K)` is plural, `count: number` is required; otherwise
 * `count` is optional.
 */
export type GetParams<C extends LocalesRecord, G extends Groups<C>, K extends Key<C, G> & string> =    & {
    data?: Data,
    locale?: string,
    group: G,
    key: K,
} &
    (IsPluralKey<C, G, K> extends true ?
        { count: number } :
        { count?: number });

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
