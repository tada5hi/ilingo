/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    Lines,
    Locales,
    Namespaces,
    PluralForms,
    PluralLeaf,
} from './types';

/**
 * Helper that returns its argument unchanged but captures it with `const`
 * type inference, so the catalog literal keeps its narrowest shape
 * (per-key string literals, `@plural`-wrapped plural leaves, etc.)
 * without the caller having to add `as const` everywhere.
 *
 * @example
 *     const catalog = defineCatalog({
 *         en: { app: { greeting: 'Hi {{name}}' } },
 *         de: { app: { greeting: 'Hallo {{name}}' } },
 *     });
 *     const ilingo = new Ilingo<typeof catalog>({
 *         store: new MemoryStore({ data: catalog }),
 *     });
 *     ilingo.get({ namespace: 'app', key: 'greeting' });  // OK
 *     ilingo.get({ namespace: 'app', key: 'unknown' });   // type error
 */
export function defineCatalog<const T extends Locales>(catalog: T): T {
    return catalog;
}

/**
 * One-file-per-locale companion to `defineCatalog`. Captures the namespaces
 * for a single locale with `const` inference so the per-key literal types
 * survive an `export default`, and validates the shape against
 * `Namespaces` so a misplaced top-level value (a stray string, the
 * wrong nesting) is caught at compile time instead of failing silently
 * at lookup.
 *
 * Combine multiple `defineLocale` files via `defineCatalog` — the const
 * generics flow through, so `Ilingo<typeof catalog>` still infers the
 * full set of legal `(namespace, key)` pairs.
 *
 * @example
 *     // locales/en.ts
 *     import { defineLocale, definePlural } from 'ilingo';
 *
 *     export default defineLocale({
 *         app:  { greeting: 'Hi {{name}}' },
 *         cart: { items: definePlural({ one: '1 item', other: '{{count}} items' }) },
 *     });
 *
 *     // locales/index.ts
 *     import en from './en';
 *     import de from './de';
 *     export const catalog = defineCatalog({ en, de });
 */
export function defineLocale<const T extends Namespaces>(locale: T): T {
    return locale;
}

/**
 * One-file-per-namespace companion to `defineCatalog` / `defineLocale`.
 * Captures the lines of a single namespace with `const` inference so the
 * per-key literal types survive an `export default`, and validates the
 * shape against `Lines` so a misplaced value (the wrong nesting, a
 * non-string/`@plural` leaf) is caught at compile time.
 *
 * Use when each namespace lives in its own file (`locales/en/app.ts`).
 * Combine via `defineLocale` / `defineCatalog` — the const generics flow
 * through, so `Ilingo<typeof catalog>` still infers the full set of legal
 * `(namespace, key)` pairs.
 *
 * @example
 *     // locales/en/app.ts
 *     import { defineNamespace, definePlural } from 'ilingo';
 *
 *     export default defineNamespace({
 *         greeting: 'Hi {{name}}',
 *         items: definePlural({ one: '1 item', other: '{{count}} items' }),
 *     });
 */
export function defineNamespace<const T extends Lines>(namespace: T): T {
    return namespace;
}

/**
 * TS/JS-friendly companion for the explicit `@plural` marker. Wraps the
 * given CLDR-categorised forms into `{ '@plural': leaf }` — the same
 * runtime shape an authored JSON file would carry — so callers writing
 * catalogs in TypeScript don't have to type the magic key by hand.
 *
 * The `const` generic preserves the literal type of each plural form for
 * downstream type inference (e.g. inside `defineCatalog`).
 *
 * JSON files cannot call functions, so they continue to use the
 * `{ "@plural": { "one": "...", "other": "..." } }` literal shape. Both
 * forms produce identical runtime data.
 *
 * @example
 *     const catalog = defineCatalog({
 *         en: {
 *             cart: {
 *                 items: definePlural({
 *                     one: '{{count}} item',
 *                     other: '{{count}} items',
 *                 }),
 *             },
 *         },
 *     });
 */
export function definePlural<const T extends PluralForms>(plural: T): { '@plural': T } & PluralLeaf {
    return { '@plural': plural };
}
