/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IStore } from './store';
import type { Formatter, FormatterRegistry  } from './utils';
import type { ConfigInput } from './config';

export type PluralCategory = 'zero' | 'one' | 'two' | 'few' | 'many' | 'other';

/**
 * CLDR-categorized translation options that live inside a [[PluralNode]]
 * — the `{ other, zero?, one?, two?, few?, many? }` shape carried as the
 * `data` of a `{ type: 'plural' }` node. `other` is required; every other
 * category is optional. Used by `Ilingo.selectPluralForm()` to pick a
 * string for a given `count` via `Intl.PluralRules`.
 */
export type PluralForms = { other: string } &
    Partial<Record<Exclude<PluralCategory, 'other'>, string>>;

/**
 * A plural leaf at a catalog key position — a tagged `{ type: 'plural' }`
 * node carrying the CLDR-categorised [[PluralForms]]. The `type`
 * discriminator disambiguates a plural from a regular nested lines object
 * whose keys happen to be CLDR-category names. It is the only recognised
 * plural form: build it with `definePlural()`, or (in JSON, which can't
 * call functions) write the literal `{ "type": "plural", "data": { ... } }`.
 */
export type PluralNode = { type: 'plural', data: PluralForms };

/**
 * Value returned by `IStore.get` after the plural node has been unwrapped
 * — a plain string or the inner [[PluralForms]] shape the orchestrator can
 * index by CLDR category. Distinct from the catalog leaf shape
 * `string | PluralNode`, where plurals are still wrapped in their node.
 */
export type Leaf = string | PluralForms;

export type ValueOrNestedValue<T> = {
    [key: string]: ValueOrNestedValue<T> | T
};

/**
 * The leaf content of a namespace — the normalized internal shape a store
 * holds after a catalog tree has been reduced. At a leaf position the
 * value is `string | PluralNode`; a nested object extends the dotted
 * **key** path (`{ nav: { home: 'Home' } }` → key `nav.home`).
 */
export type Lines = ValueOrNestedValue<string | PluralNode>;
// normalized internal shape: Record<namespace, Lines>
export type Namespaces = Record<string, Lines>;
// normalized internal shape: Record<locale, Namespaces>
export type Locales = Record<string, Namespaces>;

// ─── Catalog descriptor tree ──────────────────────────────────────────────
//
// The authoring / ingestion format consumed by every store. Built with the
// `define*` helpers (`catalog.ts`) and reduced to the internal `Locales`
// shape by `normalizeCatalog` (`catalog/normalize.ts`).
//
// Two nesting hierarchies, chosen explicitly by the author:
//   - a nested `NamespaceNode` extends the *namespace* as a dotted suffix
//     (`app` ▸ `nav` → namespace `app.nav`);
//   - a nested object inside a `LinesNode`'s `data` extends the *key*
//     (`{ nav: { home } }` → key `nav.home`).
// A plural is unambiguous either way because it is a tagged `PluralNode`.

/** Terminal leaf-group: a flat or key-nested map of translations. */
export type LinesNode = { type: 'lines', data: Lines };

/** A named child of a locale / namespace — a sub-namespace or a lines group. */
export type NamespaceChild = NamespaceNode | LinesNode;

/** A (possibly nested) namespace. Nesting extends the dotted namespace path. */
export type NamespaceNode = {
    type: 'namespace', 
    name: string, 
    data: NamespaceChild[] 
};

/**
 * One locale's content. A `LinesNode` placed directly here (no enclosing
 * namespace) is structurally allowed and reserved for the future
 * default-namespace feature — not wired up today.
 */
export type LocaleNode = {
    type: 'locale', 
    name: string, 
    data: NamespaceChild[] 
};

/** Root of a catalog tree. */
export type CatalogNode = { type: 'catalog', data: LocaleNode[] };

/**
 * Accepted input for `MemoryStore({ data })` / `normalizeCatalog`: a full
 * catalog node, a bare array of locale nodes, or a single locale node.
 */
export type CatalogInput = CatalogNode | LocaleNode[] | LocaleNode;

/**
 * Body returned by a store that already knows its `(locale, namespace)` —
 * a `LoaderStore` loader return value or an `@ilingo/fs` file. Reduced by
 * `normalizeNamespaceBody`.
 */
export type NamespaceBodyInput = LinesNode;

export type DotKey = `${string}.${string}`;

export type Data = Record<string, string | number>;

export type GetContext = {
    data?: Data,
    locale?: string,
    namespace: string,
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

/**
 * Public contract of the {@link Ilingo} orchestrator. Higher-layer
 * packages (`@ilingo/vue`, `@ilingo/vuelidate`, `@ilingo/validup`, …)
 * accept and return `IIlingo` so consumers can swap in alternative
 * implementations (test doubles, decorators) without depending on the
 * concrete class.
 */
export interface IIlingo {
    readonly stores: Map<symbol | string, IStore>;
    formatters: FormatterRegistry;

    registerStore(store: IStore): void;

    registerFormatter(name: string, formatter: Formatter): void;

    clone(overrides?: ConfigInput): IIlingo;

    merge(instance: IIlingo): void;

    setLocale(key: string): void;

    resetLocale(): void;

    getLocale(): string;

    getLocales(): Promise<string[]>;

    getResolvedLocaleChain(ctx: Pick<GetContext, 'locale'>): string[];

    getResolvedLocale(ctx: GetContext): Promise<string | undefined>;

    get(ctx: GetContext): Promise<string | undefined>;

    format(input: string, data: Record<string, any>, locale?: string): string;
}
