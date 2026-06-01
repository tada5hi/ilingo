# Catalog Design

A **catalog** is the value you hand to `MemoryStore({ data })` (or persist to disk via `FSStore`). It is a **tree of tagged descriptor nodes** built with five helpers — `defineCatalog`, `defineLocale`, `defineNamespace`, `defineLines`, and `definePlural`. The tree shape is small but every layer carries meaning: getting it right unlocks BCP-47 fallback, plural selection, and per-file authoring.

```typescript
import {
    Ilingo, MemoryStore,
    defineCatalog, defineLocale, defineNamespace, defineLines, definePlural,
} from 'ilingo';

const catalog = defineCatalog([
    defineLocale('en', [
        defineNamespace('app', [
            defineLines({ greeting: 'Hi {{name}}', nav: { home: 'Home' } }), // nav.home is a dotted KEY
        ]),
        defineNamespace('cart', [
            defineLines({ items: definePlural({ one: '{{count}} item', other: '{{count}} items' }) }),
        ]),
    ]),
]);

const ilingo = new Ilingo({ store: new MemoryStore({ data: catalog }) });

await ilingo.get({ namespace: 'app', key: 'greeting', data: { name: 'Peter' } });
// "Hi Peter"
```

The five helpers map one-to-one onto the tree levels:

| Helper | Produces | Children |
|---|---|---|
| `defineCatalog(locales)` | the **root** you pass to `MemoryStore({ data })` | an array of `defineLocale(...)` nodes |
| `defineLocale(name, children)` | a locale (`'en'`, `'pt-BR'`, …) | `defineNamespace(...)` / `defineLines(...)` |
| `defineNamespace(name, children)` | a namespace under a locale | nested `defineNamespace(...)` / `defineLines(...)` |
| `defineLines(obj)` | a flat or key-nested map of translations | — (the leaves) |
| `definePlural(forms)` | a plural leaf | — (CLDR-categorised strings) |

## The two nesting hierarchies

The tree has **two** independent ways to nest, and keeping them distinct is the key idea.

### Nested `defineNamespace` extends the dotted NAMESPACE

A `defineNamespace` inside another `defineNamespace` builds a dotted **namespace**:

```typescript
defineLocale('en', [
    defineNamespace('app', [
        defineNamespace('nav', [
            defineLines({ home: 'Home' }),
        ]),
    ]),
]);
// → namespace 'app.nav', key 'home'
await ilingo.get({ namespace: 'app.nav', key: 'home' });
```

### Nested objects inside `defineLines` extend the dotted KEY

A plain nested object passed to `defineLines` builds a dotted **key** within the current namespace:

```typescript
defineNamespace('app', [
    defineLines({ nav: { home: 'Home', settings: { title: 'Settings' } } }),
]);
// → namespace 'app', keys 'nav.home' and 'nav.settings.title'
await ilingo.get({ namespace: 'app', key: 'nav.settings.title' });
```

Both produce a reachable string — they differ only in whether the dotted path lands on the `namespace` argument or the `key` argument. Pick the namespace level when the slice maps to a file or a logical area (it becomes the `namespace` you pass to `get`); pick key nesting for grouping related strings inside one namespace.

## Per-file authoring

The library is agnostic to how you split data across files — it only sees the tree once it reaches a store. The helpers compose, so each file exports one node and a barrel assembles them.

### One file per locale

```typescript
// locales/en.ts
import { defineLocale, defineNamespace, defineLines, definePlural } from 'ilingo';

export default defineLocale('en', [
    defineNamespace('app',  [defineLines({ greeting: 'Hi {{name}}' })]),
    defineNamespace('cart', [defineLines({ items: definePlural({ one: '1 item', other: '{{count}} items' }) })]),
]);
```

```typescript
// locales/index.ts — combine into a single catalog
import { defineCatalog } from 'ilingo';
import en from './en';
import de from './de';

export const catalog = defineCatalog([en, de]);
```

**Use it when:** locales are small (low hundreds of keys), translators work one locale at a time, you want git diffs to read top-to-bottom per language.

### One file per namespace

`defineNamespace` exports a single namespace node — drop it into a `defineLocale` in a barrel:

```typescript
// locales/en/app.ts
import { defineNamespace, defineLines, definePlural } from 'ilingo';

export default defineNamespace('app', [
    defineLines({
        greeting: 'Hi {{name}}',
        items: definePlural({ one: '1 item', other: '{{count}} items' }),
    }),
]);
```

```typescript
// locales/en/index.ts
import { defineLocale } from 'ilingo';
import app from './app';
import cart from './cart';

export default defineLocale('en', [app, cart]);
```

**Use it when:** the catalog is large, multiple translators work in parallel, or you want lazy loading where each namespace's file is fetched only when its first key is read (`FSStore` and `LoaderStore` both support this).

## Authoring plurals: `definePlural`

A plural leaf is built with `definePlural(forms)`, where `forms` is keyed by CLDR category. The `other` form is required; the rest (`zero`, `one`, `two`, `few`, `many`) are optional:

```typescript
defineLines({
    items: definePlural({
        one:   '{{count}} item',
        other: '{{count}} items',
    }),
});
```

`definePlural`'s argument type is `PluralForms`, so it gives you, **locally at the call site**:

- Autocomplete for CLDR categories (`zero | one | two | few | many | other`)
- A compile error if you omit `other`
- A compile error if you spell a non-CLDR category (e.g. `singular`)

It returns a plural node (`{ type: 'plural', data: forms }`) — the same runtime shape JSON files spell out by hand. See [Pluralization](./pluralization) for the selection rules and the JSON literal form.

::: tip No `@plural` marker
`definePlural` **replaces** the old `@plural` JSON marker. A plain `{ one, other }` object inside `defineLines` is *not* a plural — it's a key-nested map (keys `one` and `other` become dotted keys). Only `definePlural(...)` (or the literal `{ "type": "plural", "data": { … } }` node in JSON) is interpreted as a plural.
:::

## JSON files

JSON can't call functions, so files spell out the node `type` literally — a lines node for ordinary strings, a plural node for plurals:

```json
{
    "type": "lines",
    "data": {
        "greeting": "Hi {{name}}",
        "nav": { "home": "Home" },
        "items": {
            "type": "plural",
            "data": { "one": "{{count}} item", "other": "{{count}} items" }
        }
    }
}
```

A JSON file is a single namespace's lines node — `FSStore` derives the namespace from the filename. See [Integrations → File System](/integrations/fs) for the on-disk layout and the dotted-namespace-to-dotted-filename rule.

## Why keys are not type-checked against the catalog

Earlier releases tried to infer the legal `(namespace, key)` pairs from the catalog literal so the compiler would reject typos. That was removed: ilingo's store model is **open-world**. A real app composes several stores — an API-backed or `LoaderStore`-backed store holds keys that don't exist at build time, and an app routinely co-owns a library's namespace (see [Stores → `namespace` is a shared key-space](./stores#composing-many-sources-namespace-is-a-shared-key-space)). Inferring a closed key set from one catalog would falsely reject keys that another store legitimately answers.

So `get()` takes a loose `string` key and returns `Promise<string | undefined>`. `definePlural` still gives local CLDR autocomplete on its own argument, but no helper drives catalog-wide key inference. `Ilingo` and `IIlingo` are **not** generic.

## See also

- [Stores](./stores) — how `MemoryStore`, `FSStore`, and `LoaderStore` consume a catalog.
- [Pluralization](./pluralization) — selection rules and the runtime contract.
