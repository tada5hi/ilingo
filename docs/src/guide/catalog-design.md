# Catalog Design

A **catalog** is the nested object you hand to `MemoryStore({ data })` (or persist to disk via `FSStore`). Its shape is small but every layer carries meaning — getting the shape right unlocks BCP-47 fallback, plural selection, and compile-time key inference.

```typescript
const catalog = {
    en: {                       // locale
        app: {                  // group (logical namespace)
            greeting: 'Hi {{name}}',
            farewell: 'Bye',
            cart: {
                items: {
                    '@plural': {
                        one:   '{{count}} item',
                        other: '{{count}} items',
                    },
                },
            },
        },
    },
    de: {
        app: { /* same shape */ },
    },
};
```

The shape is `Record<locale, Record<group, nested-record-of-leaves>>`. Each leaf is either a `string` or a `{ "@plural": { ... } }` wrapper. Everything in between is just nested keys you can address with dotted paths.

## Layout choices

The library is agnostic to how you split data across files — it only sees the merged shape once it reaches a store. Two common authoring patterns:

### One file per locale

Every locale lives in a single file (`en.ts`, `de.ts`, `en.json`, …). All groups for that locale are children of the same root.

```typescript
// locales/en.ts
export default {
    app:  { greeting: 'Hi {{name}}' },
    cart: { items: { '@plural': { one: '...', other: '...' } } },
};
```

**Use it when:** locales are small (low hundreds of keys), translators work one locale at a time, you want git diffs to read top-to-bottom per language.

### One file per `(locale, group)`

The pattern `FSStore` walks: `<directory>/<locale>/<group>.json`. Each file holds a single group for a single locale.

```
locales/
    en/
        app.json
        cart.json
    de/
        app.json
        cart.json
```

**Use it when:** the catalog is large, multiple translators work in parallel, or you want lazy loading where each group's file is fetched only when its first key is read (`FSStore` and `LoaderStore` both support this).

## `defineCatalog` — keep literal types narrow

The catalog literal carries information the type system can use to infer legal `(group, key)` pairs and detect plural leaves. TypeScript will widen literal types (`'Hi'` → `string`) the moment the value lands in a typed variable, so reach for `defineCatalog` instead of `as const` sprinkling.

```typescript
import { Ilingo, MemoryStore, defineCatalog } from 'ilingo';

const catalog = defineCatalog({
    en: { app: { greeting: 'Hi' } },
});

const ilingo = new Ilingo<typeof catalog>({
    store: new MemoryStore({ data: catalog }),
});

ilingo.get({ group: 'app', key: 'greeting' }); // OK
ilingo.get({ group: 'app', key: 'unknown' });  // type error
```

`defineCatalog<const T>(catalog)` is a runtime identity function. The work it does is purely at compile time — its `const` generic preserves the per-key literal types so the inferred `Key<C, G>` is the natural set of leaf paths, not `string`.

See [Type-Safe Keys](./type-safe-keys) for the inference rules and the `Ilingo<C>` API.

## Authoring plurals: JSON vs TS/JS

A plural leaf is the `{ "@plural": { ... } }` wrapper. JSON catalogs spell the wrapper as a string-keyed literal; TS/JS catalogs reach for the `definePlural` helper for autocomplete + a compile error on a missing `other`.

### JSON files

```json
{
    "cart": {
        "items": {
            "@plural": {
                "one":   "{{count}} item",
                "other": "{{count}} items"
            }
        }
    }
}
```

JSON can't call functions, so the literal `@plural` key is the only option. The `other` form is mandatory at runtime; missing it is detected on lookup, not at load time.

### TS / JS files

```typescript
import { defineCatalog, definePlural } from 'ilingo';

const catalog = defineCatalog({
    en: {
        cart: {
            items: definePlural({
                one:   '{{count}} item',
                other: '{{count}} items',
            }),
        },
    },
});
```

`definePlural` returns `{ '@plural': forms }` — identical runtime shape to the JSON literal. The signature `<const T extends PluralForms>(forms: T)` gives you:

- Autocomplete for CLDR categories (`zero | one | two | few | many | other`)
- A compile error if you omit `other`
- A compile error if you spell a non-CLDR category (e.g. `singular`)
- Literal types preserved for downstream `Ilingo<typeof catalog>` inference

When you mix JSON for one locale and TS for another in the same catalog, both wrap to the same runtime shape — `Intl.PluralRules` doesn't care which authoring path produced the leaf.

For the runtime contract and CLDR-category fallback rules, see [Pluralization](./pluralization).

## Bare `{ one, other }` is not a plural

A `{ one: ..., other: ... }` object without the `@plural` wrapper is a regular nested namespace. The store walks past it, the keys `one` and `other` are reachable via dotted access:

```typescript
const catalog = defineCatalog({
    en: {
        form: {
            kind: {
                // Just a namespace — sibling keys named after CLDR categories
                // are safe and addressable individually.
                other: { label: 'Other' },
                custom: { label: 'Custom' },
            },
        },
    },
});

await ilingo.get({ group: 'form', key: 'kind.other.label' });   // "Other"
await ilingo.get({ group: 'form', key: 'kind' });               // undefined (not a leaf)
```

This is the inverse design from libraries that auto-detect bare `{ one, other }` shapes — the explicit `@plural` discriminator means a UI catalog with an enum dropdown labelled "Other" never collides with the plural selector.

## Catalog shape recap

| At this position | The value can be |
|---|---|
| Top-level | A locale code (`'en'`, `'de'`, `'pt-BR'`, …) — BCP-47 |
| Locale | A `Record<group, ...>` where each group is your logical namespace |
| Group | A nested `Record<string, …>` — any depth |
| Leaf | `string` (the translation) OR `{ "@plural": { other: string, zero?: string, ... } }` |

Keys may be reached as dotted paths (`'cart.items'`, `'nested.deep.leaf'`). The `'@plural'` marker is the only special key name — every other key is treated as a regular namespace step.

## See also

- [Stores](./stores) — how `MemoryStore`, `FSStore`, and `LoaderStore` consume a catalog.
- [Type-Safe Keys](./type-safe-keys) — the `Ilingo<C>` API and `Key<C, G>` inference.
- [Pluralization](./pluralization) — selection rules and the runtime contract.
