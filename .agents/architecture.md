# Architecture

## Overview

ilingo follows a small **port-and-adapter** design:

- **Port**: `IStore` (`packages/ilingo/src/store/types.ts`) defines `get`, `set`, `getLocales`.
- **Adapters**: `MemoryStore` (default, in-memory) and `FSStore` (lazy-loads files from disk, persists `set()` to JSON) implement the port.
- **Orchestrator**: `Ilingo` (`packages/ilingo/src/module.ts`) holds a `Set<IStore>` plus per-instance state for the locale, fallback chain, missing-key handler, plural-rules cache, and warn-once memo. On each `get()` it walks a resolved locale chain in order; within each locale it queries every store **in parallel** and picks the first hit (in declared store order).

Higher-layer packages (`@ilingo/vue`, `@ilingo/vuelidate`) wrap the orchestrator for a specific framework — Vue's `provide`/`inject` makes the `Ilingo` instance and locale `Ref` available to descendants of the app root.

## Core Design Decisions

### 1. Locale-first walk with fallback chain

`Ilingo.get(ctx)` resolves a locale **chain** before querying anything (`getResolvedLocaleChain`). The chain order is `[requested, ...explicit-or-BCP-47-parents, default]`, deduplicated, with `default` pinned at the terminal position so it cannot be reordered out by an earlier mention. The chain is walked locale-first: closer locale beats farther one *regardless of store insertion order*. The chain can be inspected via `getResolvedLocaleChain(ctx)`; the locale that actually yielded a value is reachable via `getResolvedLocale(ctx)`.

### 2. Parallel store query within a locale

For each locale in the chain, the orchestrator issues `store.get(...)` for every store **concurrently** via `Promise.all`, then picks the first hit in declared insertion order. The locale-order semantics are preserved (closer locale always wins); only intra-locale I/O overlaps. Trade-off: stores later in declared order are still queried even when an earlier store would have hit — cheap for the in-memory + fs adapters here, but custom network-backed or side-effecting stores will see every call. Document this on custom stores that care.

### 3. Multi-store, identity-based deduping

`Ilingo` holds a **set** of stores. `merge(otherIlingo)` is the only supported way to combine two instances; it adds foreign stores that are not already present (identity check, not deep equality). Set semantics keep `add` idempotent for the same reference.

### 4. Group/key/count model

Translations are addressed by `(locale, group, key)` plus an optional `count` for pluralization. The `group` is a logical namespace — typically a filename when using `FSStore` (`packages/fs/src/module.ts` resolves `<directory>/<locale>/<group>.{js,mjs,cjs,ts,mts,json,conf}`). The `key` is a `pathtrace`-style dotted path within that group's nested object.

### 5. Plural leaves: explicit marker preferred

A leaf can be either a plain `string` or a `PluralLeaf` (`{ zero?, one?, two?, few?, many?, other }`). Two storage forms are accepted:

- **Explicit (recommended)** — `{ "@plural": { one, other, ... } }`. Detection keys off the marker so siblings with CLDR-category names cannot collide.
- **Structural (back-compat)** — bare `{ one, other }` with all keys being CLDR categories and `other` present.

The orchestrator selects a form using `Intl.PluralRules` keyed by the *resolved* locale (the one that actually matched). `Intl.PluralRules` instances are cached per locale on the `Ilingo` instance.

### 6. Template formatters via a per-instance registry

Template placeholders accept modifier syntax: `{{value, formatter}}` and `{{value, formatter(opt=value, ...)}}`. The orchestrator owns a `FormatterRegistry` instance that:

- Holds the built-in formatters `number`, `date`, `list` (backed by `Intl.NumberFormat` / `Intl.DateTimeFormat` / `Intl.ListFormat`).
- Memoises `Intl.*Format` instances keyed by `(formatter, locale, JSON-encoded options)` so repeated renders don't reallocate.
- Exposes `register(name, fn)` and `get(name)` — designed so Phase 6 (#906) opens it to user-supplied formatters without re-architecting.

The locale handed to a formatter is the **resolved** locale (the one that actually yielded the message), not the requested one. Unknown modifiers fall back to `String(value)` and emit a per-instance dev-mode one-shot warning via the same `isProductionEnv()` gate used by the missing-key handler.

### 7. Type-safe keys via a generic `Ilingo<Catalog>`

`Ilingo` is generic in the catalog: `class Ilingo<C extends LocalesRecord = LocalesRecord>`. When `C` is the default `LocalesRecord` (no generic supplied) the API stays as loose as before — `group: string`, `key: string`. When `C` is a concrete catalog, `Groups<C>` / `Key<C, G>` infer the legal pairs and `IsPluralKey<C, G, K>` makes `count` *required* at the type level for plural leaves.

Helpers in `packages/ilingo/src/types.ts`:

- `AnyGroups<C>` — pick any locale's group map (catalogs SHOULD share a shape across locales).
- `Groups<C>` — union of top-level group names.
- `LeafAt<T, K>` — walk a dotted key path through a typed object; `never` on miss.
- `DottedPaths<T>` — enumerate all dotted leaf paths; short-circuits to `string` for open-shape inputs (so `LocalesRecord` reduces to a `string`-typed key, not `never`).
- `Key<C, G>`, `IsPluralKey<C, G, K>`, `GetParams<C, G, K>`.

`defineCatalog<const T>(c)` (`packages/ilingo/src/catalog.ts`) is a runtime identity function with a `const` generic that captures the catalog literal without losing inference — saves callers from sprinkling `as const`.

### 8. ESM-first, dependency-light, browser-safe

Each package's runtime dependencies are minimal — `pathtrace` and `smob` in core; `locter`, `pathe`, `smob` in `@ilingo/fs`. Vue and Vuelidate are declared as `peerDependencies`, not bundled. Core does not import `node:process` — `NODE_ENV` is read via a bare `process.env.NODE_ENV` literal (so Vite / Webpack DefinePlugin can replace it) wrapped in a `typeof process !== 'undefined'` guard for raw-browser execution.

## Design Patterns

### Store Pattern (port + adapter)

Port — `packages/ilingo/src/store/types.ts`:

```typescript
export type StoreGetContext = { locale: string, group: string, key: string };
export type StoreSetContext = StoreGetContext & { value: Leaf };

export interface IStore {
    get(context: StoreGetContext): Promise<Leaf | undefined>;
    set(context: StoreSetContext): Promise<void>;
    getLocales(): Promise<string[]>;
}
```

Adapter — `packages/ilingo/src/store/memory.ts` (returns either form, normalized via `asPluralLeaf`):

```typescript
async get(ctx: StoreGetContext): Promise<Leaf | undefined> {
    const group = this.data[ctx.locale]?.[ctx.group];
    if (!group) return undefined;
    const out = getPathValue(group, ctx.key);
    if (typeof out === 'string') return out;
    return asPluralLeaf(out); // unwraps `{ "@plural": ... }` or bare structural
}
```

Conventions:

- New stores **implement `IStore`** rather than extending `MemoryStore` unless they want the in-memory cache (`FSStore` extends it, using the parent map as a load cache).
- All methods are async, even when synchronous — keep that contract; `Ilingo.lookup` `await`s every store call.
- A miss is `undefined`. Do not throw on miss; that breaks the fallback walk.
- Returning a `PluralLeaf` is allowed but optional — string-only stores remain valid.

### Orchestrator Pattern (`Ilingo`)

```typescript
async get(ctx: GetContext): Promise<string | undefined> {
    const requestedLocale = ctx.locale ?? this.getLocale();
    const chain = this.getResolvedLocaleChain({ locale: requestedLocale });

    const hit = await this.lookup(chain, ctx);
    if (!hit) return this.handleMissingKey(ctx, requestedLocale, chain);

    const message = this.selectPluralForm(hit.leaf, hit.locale, ctx.count);
    const data: Data = { ...(ctx.data || {}) };
    if (typeof ctx.count === 'number' && typeof data.count === 'undefined') {
        data.count = ctx.count;
    }
    return this.format(message, data);
}

protected async lookup(chain, ctx) {
    const stores = Array.from(this.stores);
    for (const locale of chain) {
        const results = await Promise.all(stores.map(s => s.get({ locale, ...ctx })));
        for (const candidate of results) {
            if (typeof candidate !== 'undefined') return { locale, leaf: candidate };
        }
    }
}
```

`Ilingo` owns: the locale (default `'en'` from `LOCALE_DEFAULT`), the ordered store set, the fallback config, the missing-key handler, a per-instance `pluralRulesCache: Map<string, Intl.PluralRules>`, a per-instance `formatters: FormatterRegistry` (with its own `Intl.*Format` cache), a per-instance `warnedKeys` / `warnedFormatters: Set<string>` for the two warn-once channels, and the `{{var}}` template formatter. Framework-specific concerns live in higher-layer packages.

### Missing-key handler

`Config.onMissingKey?: (ctx) => string | undefined`. Invoked when the chain × stores walk exhausts without a hit. Receives a `MissingKeyContext` carrying the *resolved* `locale` (never undefined) plus `resolvedLocale` = the chain terminator. Returning a string makes that string the result of `get()`; returning `undefined` keeps the result `undefined`.

If `onMissingKey` is not configured, the built-in default warns once per `(requestedLocale, group, key)` per instance, silenced when `process.env.NODE_ENV === 'production'`. The warn-once set is per-instance so multiple `Ilingo` instances don't dedupe each other's warnings.

### Vue Plugin Pattern

`@ilingo/vue` exposes `install(app, input)` and a default `Plugin` object. `applyInstallInput` is the heart of it — idempotent and merge-aware:

1. Read any already-`provide`d `Ilingo` instance and locale `Ref` from the app.
2. Resolve the new `input`: nothing → fresh `Ilingo`; an `Ilingo` → merge into existing or use directly; an `Options { store, locale }` → add the store to the existing instance or create one.
3. Provide the instance and locale only if they were not provided before — so calling `install` more than once does not clobber existing wiring.

`useTranslation(ctx)` forwards `count` as `MaybeRef<number>` (unwrapped via `unref`) so plural selection is reactive to count changes the same way `data` is.

`@ilingo/vuelidate` chains this: it calls `applyInstallInput`, then ensures its own `Store` (a `MemoryStore` pre-loaded with EN/DE/FR/ES validator translations) is registered if none is present yet.

## Data Flow

```
Input:
  └── ctx: { group, key, locale?, data?, count? }    (caller — code, <ITranslate>, useTranslation)

Processing:
  1. requestedLocale = ctx.locale ?? instance default
  2. chain = resolveLocaleChain(requested, fallback config, LOCALE_DEFAULT)
       └── e.g. 'pt-BR' → ['pt-BR', 'pt', 'en']  (default tail; opt out via fallback: false | [])
  3. lookup(chain, ctx):
       for each locale in chain:
           Promise.all(stores.map(s => s.get({ locale, group, key })))
           → first defined candidate (in declared store order) wins
       → { locale: hitLocale, leaf: string | PluralLeaf }
  4. If miss → handleMissingKey → onMissingKey or warn-once default
  5. selectPluralForm(leaf, hitLocale, count)
       └── Intl.PluralRules(hitLocale) [cached] selects category, falls back to 'other'
  6. count auto-merges into data if absent
  7. template(message, data, { locale: hitLocale, formatters }) substitutes
     {{var}} and {{var, formatter(opts)}} placeholders

Output:
  └── Promise<string | undefined>     ('undefined' = handler returned no string)
```

## Error Handling

- Misses return `undefined`. They are never errors.
- `FSStore.loadGroup` short-circuits the "already loaded" case (`isLoaded` guard).
- File-loading errors from `locter`/`load` propagate. There is no project-wide error wrapper.
- `template()` does **not** error on a missing data key — the `{{var}}` stays in the output.
- Vue's `useTranslation` falls back to `"${group}.${key}"` when `Ilingo.get` returns `undefined` (the orchestrator's `onMissingKey` runs first and may substitute).

## File Structure (architectural layers)

```text
packages/ilingo/src/
├── module.ts                ← orchestrator (Ilingo class)
├── store/{types,memory}     ← port + default adapter
├── catalog.ts               ← defineCatalog<const T>() helper
├── utils/
│   ├── locale.ts            ← bcp47Parents, resolveLocaleChain
│   ├── identify.ts          ← isPluralLeaf, isPluralLeafExplicit, asPluralLeaf, isLineRecord, PLURAL_MARKER
│   ├── formatters.ts        ← FormatterRegistry, parseFormatterOptions, parseModifier, Formatter type
│   ├── template.ts          ← {{var}} + {{var, formatter(opts)}} substitution
│   └── language/            ← isBCP47LanguageCode + CLDR data
└── config/                  ← typed input shape

packages/fs/src/module.ts            ← second IStore adapter (FSStore, persists set() as JSON)
packages/vue/src/index.ts            ← framework integration (Vue plugin)
packages/vuelidate/src/store.ts      ← preloaded MemoryStore for validator names
```

## Configuration

There are no environment variables. All configuration is passed via constructor inputs:

| Object                    | Shape                                                                                                                                |
|---------------------------|--------------------------------------------------------------------------------------------------------------------------------------|
| `new Ilingo(input)`       | `{ store?: IStore, locale?: string, fallback?: Fallback, onMissingKey?: MissingKeyHandler }`                                          |
| `new MemoryStore(opts)`   | `{ data: LocalesRecord }`                                                                                                            |
| `new FSStore(input)`      | `{ directory?: string \| string[], writeDirectory?: string }`                                                                       |
| Vue `install(app, input)` | `Options { store, locale } \| Ilingo \| undefined`                                                                                  |

`Fallback = string | string[] | (locale) => string[] | false`. Explicit-empty forms (`[]`, `false`, or a resolver returning `[]`) opt out of fallback entirely — the chain is just `[locale]` with no default-locale tail.
