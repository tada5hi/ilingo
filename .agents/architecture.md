# Architecture

## Overview

ilingo follows a small **port-and-adapter** design:

- **Port**: `IStore` (`packages/ilingo/src/store/types.ts`) defines `get`, `set`, `getLocales`.
- **Adapters**: `MemoryStore` (default, in-memory) and `FSStore` (lazy-loads files from disk, persists `set()` to JSON) implement the port.
- **Orchestrator**: `Ilingo` (`packages/ilingo/src/module.ts`, implementing the `IIlingo` interface) holds a `Map<symbol, IStore>` plus per-instance state for the locale, fallback chain, missing-key handler, plural-rules cache, and warn-once memo. On each `get()` it walks a resolved locale chain in order; within each locale it queries stores **serially in insertion order** and stops at the first hit.
- **Public contract**: `IIlingo<C>` is the orchestrator's interface — every method on `Ilingo` plus the `stores` map and `formatters` registry. Higher-layer packages (`@ilingo/vue`, `@ilingo/vuelidate`, `@ilingo/validup`, …) accept and return `IIlingo` in type positions so consumers can swap test doubles or decorating wrappers without depending on the concrete class. Construction still goes through the `Ilingo` class; runtime discrimination uses structural duck-typing (`'stores' in input`) so non-concrete `IIlingo` implementations are still recognised by `@ilingo/vue`'s `applyInstallInput`.

Higher-layer packages (`@ilingo/vue`, `@ilingo/vuelidate`) wrap the orchestrator for a specific framework — Vue's `provide`/`inject` makes the `IIlingo` instance and locale `Ref` available to descendants of the app root.

## Core Design Decisions

### 1. Locale-first walk with fallback chain

`Ilingo.get(ctx)` resolves a locale **chain** before querying anything (`getResolvedLocaleChain`). The chain order is `[requested, ...explicit-or-BCP-47-parents, default]`, deduplicated, with `default` pinned at the terminal position so it cannot be reordered out by an earlier mention. The chain is walked locale-first: closer locale beats farther one *regardless of store insertion order*. The chain can be inspected via `getResolvedLocaleChain(ctx)`; the locale that actually yielded a value is reachable via `getResolvedLocale(ctx)`.

### 2. Serial store query within a locale

For each locale in the chain, the orchestrator walks the stores **serially in insertion order** and returns the first defined hit. Locale-order semantics still dominate (closer locale always wins, regardless of which store would have answered), and within a locale the walk stops the moment an earlier store answers — later stores never see the call. This is the contract that makes "local first, remote fallback" composition behave intuitively: registering a network-backed adapter after a Memory adapter never causes an HTTP request when the Memory adapter has the key.

Trade-off accepted: when every registered store *would* have hit, total latency is `sum(per-store latency)` rather than `max(per-store latency)`. Pre-stable history kept this as a `Promise.all` parallel walk; it was flipped to serial-on-miss in [#917 Track B](plans/007-stability-roadmap.md) so the default composition matches user intuition. Speculative concurrency was rarely useful in practice — the in-tree adapters are sync after their first warm-up — and the parallel default was an active footgun for network-backed adapters.

### 3. Multi-store, symbol-keyed deduping

`Ilingo` holds a `Map<symbol, IStore>` — the symbol key is the store's **identity**, and the Map's insertion order is the query order. `register(store, id?)` is the registration primitive: with an `id` it is idempotent (a no-op if that key is already present, keeping the existing store); without one it mints a fresh `Symbol('ilingo.store')` and always adds. The constructor's `store` option routes through `register`.

Library adapters register their catalog under a `Symbol.for('@scope/pkg')` global-registry symbol (`@ilingo/validup` → `Symbol.for('@ilingo/validup')`, `@ilingo/vuelidate` → `Symbol.for('@ilingo/vuelidate')`, each exported as `STORE_ID`). Because `Symbol.for` is identity-stable across module instances, re-registration — even from a duplicate package copy (pnpm / peer-dep mismatch) — collides on the same key and stays a no-op. This replaced an earlier `instanceof Store` scan, which double-registered across duplicate copies and couldn't dedupe app-seeded stores.

`merge(otherIlingo)` folds another instance's stores in, deduping by symbol key: a foreign key already present is skipped (existing store wins), foreign keys not present are appended in order. `Symbol.for`-keyed library catalogs never stack across a merge; anonymously-keyed stores (minted `Symbol()`) are always distinct and always carried over. `clone()` copies the parent's `(symbol, store)` entries preserving keys, so a later `merge` between a clone and its parent dedupes correctly.

**`namespace` is a shared key-space, not single-owner.** `MemoryStore.get()` returns `undefined` per *missing key*, so the orchestrator falls through store-by-store *within the same namespace*. An app therefore co-owns a library's namespace (e.g. `validup`): registering its own store **first** lets it add custom keys and override individual ones, while the library catalog (appended) supplies the built-in defaults for everything the app store misses. This is the canonical composition for "backend with its own translations + a validation library that ships its own."

### 3a. `IIlingo` contract

`module.ts` exports an `IIlingo` interface that `Ilingo` implements. Higher-layer packages type against `IIlingo` (the Vue provide/inject layer — `provideIlingo`/`injectIlingo`/`injectIlingoSafe` — and the library `register(ilingo: IIlingo)` helpers) so consumers can swap in alternative implementations without depending on the concrete class. The concrete `Ilingo` is still imported where an instance must be *constructed* (`new Ilingo()` in `applyInstallInput`); the `instanceof Ilingo` branch there was replaced with an `isIlingo(input)` guard (`'stores' in input`) so a non-concrete `IIlingo` is recognised.

### 4. Group/key/count model

Translations are addressed by `(locale, namespace, key)` plus an optional `count` for pluralization. The `namespace` is a logical namespace — typically a filename when using `FSStore` (`packages/fs/src/module.ts` resolves `<directory>/<locale>/<namespace>.{js,mjs,cjs,ts,mts,json,conf}`). The `key` is a `pathtrace`-style dotted path within that namespace's nested object.

### 5. Plural leaves: `@plural` wrapper is the only recognised form

A catalog leaf is either a plain `string` or a `PluralLeaf` (`{ '@plural': { zero?, one?, two?, few?, many?, other } }`). The inner CLDR-categorised options shape is exported as `PluralForms`. The `@plural` marker is the only signal that an object should be interpreted as a plural — a bare `{ one, other }` object is treated as an ordinary nested namespace.

This was a stability-roadmap decision (#917 Track B): the original dual-form behaviour (also accepting bare `{ one, other }`) collided with sibling keys named after CLDR categories. Since pluralization had never shipped a stable release, the structural form was removed outright rather than going through a deprecate-then-remove cycle.

The orchestrator selects a form using `Intl.PluralRules` keyed by the *resolved* locale (the one that actually matched). `Intl.PluralRules` instances are cached per locale on the `Ilingo` instance.

### Cache invalidation

Stores that cache lookups implement `InvalidatingStore extends IStore`:

```typescript
export interface InvalidatingStore extends IStore {
    invalidate(locale?: string, namespace?: string): void;
    on(event: 'invalidate', listener: (locale?, namespace?) => void): () => void;
}
```

`invalidate(...)` drops scoped cache entries (`()` = everything, `(locale)` = all namespaces, `(locale, namespace)` = one). The `on('invalidate')` event fires after the cache is dropped — subscribers see the post-invalidate state.

Both `LoaderStore` (core) and `FSStore` (`@ilingo/fs`) implement it. Detect at runtime via `isInvalidatingStore(store)` — the type guard checks for both `invalidate` and `on` methods.

`@ilingo/vue`'s `useTranslation` walks `instance.stores` at composable-setup time, subscribes to every `InvalidatingStore`, and bumps an internal trigger ref on `invalidate` events that match the current `(locale, namespace)`. The `computedAsync` reads the ref in its dep set, so the re-fetch happens automatically. Unsubscribes are wired to `onScopeDispose`.

### `LoaderStore`

`packages/ilingo/src/store/loader.ts`. Lazy-loaded store backed by a user-supplied `loader(locale, namespace) => Promise<Lines | undefined>`. Caches per `(locale, namespace)` so the loader is called at most once per pair until `invalidate()` is called. De-duplicates concurrent `get()`s for the same pair via an in-flight map.

Misses (loader returning `undefined`) are cached too — the loader isn't re-called for known-missing pairs. Designed for browser code-splitting: typical loader is `(l, g) => import(\`./locales/${l}/${g}.json\`).then(m => m.default)`.

`getLocales()` returns the declared `locales: string[]` option when provided; otherwise the set of locales seen so far (best-effort).

### `FSStore.watch`

`packages/fs/src/module.ts`. Optional `watch: boolean` config field. When true, lazy-imports `chokidar` (declared as an *optional* peer dependency in `@ilingo/fs/package.json`) and starts a watcher over the configured directories. File changes under `<dir>/<locale>/<namespace>.<ext>` are mapped back to `(locale, namespace)` via `parseLocaleNamespace`, which strips the directory prefix and validates the locale segment against `isBCP47LanguageCode`.

`chokidar` is an optional peer because most production deployments don't want a file watcher running — and the dep weight is ~1MB. If `watch: true` is set without chokidar installed, the store logs a one-line error and continues without watching (the rest of the store works normally).

`close()` stops the watcher and detaches all listeners — idempotent, callable in tests and on app shutdown.

### Locale negotiation utilities

`packages/ilingo/src/utils/negotiate.ts` exposes two pure helpers for picking a locale from a request:

- `negotiateLocale(supported, requested): string | undefined` — BCP-47 best-match (exact → prefix → parent walk). Returns the matching entry from `supported`, preserving its original casing.
- `parseAcceptLanguage(header): string[]` — parses an RFC 9110 `Accept-Language` header into a quality-sorted tag list (drops `*`).

These are utility-style — they don't touch `Ilingo` state. Callers compose them: `ilingo.setLocale(negotiateLocale(supported, requested) ?? defaultLocale)`. Kept in core so server-side (Express / Hono / Nuxt server routes) and client-side (`navigator.languages`) consumers share the same matcher.

### 6. Template formatters via a per-instance registry

Template placeholders accept modifier syntax: `{{value, formatter}}` and `{{value, formatter(opt=value, ...)}}`. The orchestrator owns a `FormatterRegistry` instance that:

- Holds the built-in formatters `number`, `date`, `list` (backed by `Intl.NumberFormat` / `Intl.DateTimeFormat` / `Intl.ListFormat`).
- Memoises `Intl.*Format` instances keyed by `(formatter, locale, JSON-encoded options)` so repeated renders don't reallocate.
- Exposes `register(name, fn)` / `get(name)` publicly. Two ergonomic entry points sit on `Ilingo`: `registerFormatter(name, fn)` (delegates to the registry) and `Config.formatters` (constructor-time bulk registration). Names registered via either surface override the built-ins if they collide.

The locale handed to a formatter is the **resolved** locale (the one that actually yielded the message), not the requested one. Unknown modifiers fall back to `String(value)` and emit a per-instance dev-mode one-shot warning via the same `isProductionEnv()` gate used by the missing-key handler.

`clone()` shares the formatter registry by reference — custom formatters registered on either side are visible to both. Callers that need isolation should build the child instance directly.

### 7. Type-safe keys via a generic `Ilingo<Catalog>`

`Ilingo` is generic in the catalog: `class Ilingo<C extends Locales = Locales>`. When `C` is the default `Locales` (no generic supplied) the API stays as loose as before — `namespace: string`, `key: string`. When `C` is a concrete catalog, `Namespaces<C>` / `Key<C, G>` infer the legal pairs and `IsPluralKey<C, G, K>` makes `count` *required* at the type level for plural leaves.

Helpers in `packages/ilingo/src/types.ts`:

- `AnyNamespaces<C>` — pick any locale's namespace map (catalogs SHOULD share a shape across locales).
- `Namespaces<C>` — union of top-level namespace names.
- `LeafAt<T, K>` — walk a dotted key path through a typed object; `never` on miss.
- `DottedPaths<T>` — enumerate all dotted leaf paths; short-circuits to `string` for open-shape inputs (so `Locales` reduces to a `string`-typed key, not `never`).
- `Key<C, G>`, `IsPluralKey<C, G, K>`, `GetParams<C, G, K>`.

`defineCatalog<const T>(c)` (`packages/ilingo/src/catalog.ts`) is a runtime identity function with a `const` generic that captures the catalog literal without losing inference — saves callers from sprinkling `as const`.

`defineLocale<const T extends Namespaces>(locale)` is the per-locale counterpart, used when each locale lives in its own file (`locales/en.ts`). It preserves literal types through an `export default` and validates the shape against `Namespaces` so a stray top-level string is caught at compile time (where `as const` would let it through). Combines with `defineCatalog` — the per-locale const generics flow through `defineCatalog`'s own const generic, so the merged `Ilingo<typeof catalog>` still infers full key paths.

`definePlural<const T>(plural)` is the TS/JS-friendly companion to the explicit `@plural` JSON marker. Returns `{ '@plural': leaf }` — same runtime shape as the JSON literal — with CLDR-category autocomplete and a compile error on missing-`other` / non-CLDR keys. Both forms produce identical runtime data: JSON files keep using the `"@plural"` literal (they can't call functions), TS/JS files use `definePlural()`.

### 8. ESM-first, dependency-light, browser-safe

Each package's runtime dependencies are minimal — `pathtrace` and `smob` in core; `locter`, `pathe`, `smob` in `@ilingo/fs`. Vue and Vuelidate are declared as `peerDependencies`, not bundled. Core does not import `node:process` — `NODE_ENV` is read via a bare `process.env.NODE_ENV` literal (so Vite / Webpack DefinePlugin can replace it) wrapped in a `typeof process !== 'undefined'` guard for raw-browser execution.

## Design Patterns

### Store Pattern (port + adapter)

Port — `packages/ilingo/src/store/types.ts`:

```typescript
export type StoreGetContext = { locale: string, namespace: string, key: string };
export type StoreSetContext = StoreGetContext & { value: Leaf };

export interface IStore {
    get(context: StoreGetContext): Promise<Leaf | undefined>;
    set(context: StoreSetContext): Promise<void>;
    getLocales(): Promise<string[]>;
}
```

Adapter — `packages/ilingo/src/store/memory.ts` (unwraps the `@plural` marker; bare `{ one, other }` objects are namespaces, not plurals):

```typescript
async get(ctx: StoreGetContext): Promise<Leaf | undefined> {
    const namespace = this.data[ctx.locale]?.[ctx.namespace];
    if (!namespace) return undefined;
    const out = getPathValue(namespace, ctx.key);
    if (typeof out === 'string') return out;
    if (isPluralLeaf(out)) return out['@plural'];
    return undefined;
}
```

Conventions:

- New stores **implement `IStore`** rather than extending `MemoryStore` unless they want the in-memory cache (`FSStore` extends it, using the parent map as a load cache).
- All methods are async, even when synchronous — keep that contract; `Ilingo.lookup` `await`s every store call.
- A miss is `undefined`. Do not throw on miss; that breaks the fallback walk.
- Returning `PluralForms` (the unwrapped inner shape) is allowed but optional — string-only stores remain valid. Custom stores that hold raw `PluralLeaf` (`{ "@plural": ... }`) values should unwrap before returning, matching `MemoryStore` / `LoaderStore`.

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
    for (const locale of chain) {
        for (const store of this.stores.values()) {
            const candidate = await store.get({ locale, ...ctx });
            if (typeof candidate !== 'undefined') return { locale, leaf: candidate };
        }
    }
}
```

`Ilingo` owns: the locale (default `'en'` from `LOCALE_DEFAULT`), the ordered store set, the fallback config, the missing-key handler, a per-instance `pluralRulesCache: Map<string, Intl.PluralRules>`, a per-instance `formatters: FormatterRegistry` (with its own `Intl.*Format` cache), a per-instance `warnedKeys` / `warnedFormatters: Set<string>` for the two warn-once channels, and the `{{var}}` template formatter. Framework-specific concerns live in higher-layer packages.

### Missing-key handler

`Config.onMissingKey?: (ctx) => string | undefined`. Invoked when the chain × stores walk exhausts without a hit. Receives a `MissingKeyContext` carrying the *resolved* `locale` (never undefined) plus `resolvedLocale` = the chain terminator. Returning a string makes that string the result of `get()`; returning `undefined` keeps the result `undefined`.

If `onMissingKey` is not configured, the built-in default warns once per `(requestedLocale, namespace, key)` per instance, silenced when `process.env.NODE_ENV === 'production'`. The warn-once set is per-instance so multiple `Ilingo` instances don't dedupe each other's warnings.

### Vue Plugin Pattern

`@ilingo/vue` exposes `install(app, input)` and a default `Plugin` object. `applyInstallInput` is the heart of it — idempotent and merge-aware:

1. Read any already-`provide`d `Ilingo` instance and locale `Ref` from the app.
2. Resolve the new `input`: nothing → fresh `Ilingo`; an `Ilingo` → merge into existing or use directly; an `Options { store, locale }` → add the store to the existing instance or create one.
3. Provide the instance and locale only if they were not provided before — so calling `install` more than once does not clobber existing wiring.

`useTranslation(ctx)` forwards `count` as `MaybeRef<number>` (unwrapped via `unref`) so plural selection is reactive to count changes the same way `data` is.

`@ilingo/vuelidate` chains this: it calls `applyInstallInput`, then ensures its own `Store` (a `MemoryStore` pre-loaded with EN/DE/FR/ES validator translations) is registered if none is present yet.

### Slot-aware rendering — `<ITranslateT>` + `tokenize()`

`<ITranslateT>` extends `<ITranslate>` with **slot placeholders**: a message can contain `{slot}` markers (single curly) alongside the usual `{{var}}` interpolations (double curly). The component renders each slot from a named scoped slot, producing inline VNodes (links, bold runs, icons) without splitting the message across keys.

Core support lives in `packages/ilingo/src/utils/template.ts` as a separate `tokenize(str): TemplateToken[]` function. Tokens are `text` / `var` / `slot`. The plain `template()` function continues to return a string (used by `Ilingo.format`); the tokenizer is for renderers that produce structured output. `template()` and `tokenize()` share no state — they're parallel parsers over the same syntax.

### `v-t` directive

`packages/vue/src/directives/t.ts` exposes a `createVTDirective(instance, localeRef)` factory. Registered by `install()` on the Vue app under the name `t`, opt-out via `Options.directives: false`. The directive writes the translation to the element's `textContent` and uses `watchEffect` to track the locale Ref — locale changes update the element in place, no remount required. A stop-handle is stashed on the element via a `Symbol.for('ilingo.v-t.stop')` key so the directive can cancel the effect on unmount and re-subscribe on update.

### Scoped catalogs — `useScopedCatalog`

Creates a fresh `Ilingo` instance with a `MemoryStore` for the scoped messages registered *first* (scoped strings win), then re-adds every store from the parent instance (non-scoped keys still fall through). Calls `provideIlingo(scoped)` so the component subtree sees the scoped instance via plain `useTranslation`. Returns `{ instance, t }` for same-component use, since Vue's provide can't reach the current setup's own injections.

## Data Flow

```
Input:
  └── ctx: { namespace, key, locale?, data?, count? }    (caller — code, <ITranslate>, useTranslation)

Processing:
  1. requestedLocale = ctx.locale ?? instance default
  2. chain = resolveLocaleChain(requested, fallback config, LOCALE_DEFAULT)
       └── e.g. 'pt-BR' → ['pt-BR', 'pt', 'en']  (default tail; opt out via fallback: false | [])
  3. lookup(chain, ctx):
       for each locale in chain:
           for each store in insertion order:
               return on first defined candidate
       → { locale: hitLocale, leaf: string | PluralForms } // post-unwrap
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
- `FSStore.loadNamespace` short-circuits the "already loaded" case (`isLoaded` guard).
- File-loading errors from `locter`/`load` propagate. There is no project-wide error wrapper.
- `template()` does **not** error on a missing data key — the `{{var}}` stays in the output.
- Vue's `useTranslation` falls back to `"${namespace}.${key}"` when `Ilingo.get` returns `undefined` (the orchestrator's `onMissingKey` runs first and may substitute).

## File Structure (architectural layers)

```text
packages/ilingo/src/
├── module.ts                ← orchestrator (Ilingo class)
├── store/{types,memory}     ← port + default adapter
├── catalog.ts               ← defineCatalog<const T>() + defineLocale<const T>() + definePlural<const T>() helpers
├── utils/
│   ├── locale.ts            ← bcp47Parents, resolveLocaleChain
│   ├── negotiate.ts         ← negotiateLocale, parseAcceptLanguage (request-side locale picking)
│   ├── identify.ts          ← isPluralLeaf (wrapper guard), isPluralForms (inner-shape guard), isLineRecord, PLURAL_MARKER
│   ├── formatters.ts        ← FormatterRegistry (with public register/get), parseFormatterOptions, parseModifier, Formatter type
│   ├── template.ts          ← {{var}} + {{var, formatter(opts)}} substitution; tokenize() for slot-aware renderers
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
| `new MemoryStore(opts)`   | `{ data: Locales }`                                                                                                            |
| `new FSStore(input)`      | `{ directory?: string \| string[], writeDirectory?: string }`                                                                       |
| Vue `install(app, input)` | `Options { store, locale } \| Ilingo \| undefined`                                                                                  |

`Fallback = string | string[] | (locale) => string[] | false`. Explicit-empty forms (`[]`, `false`, or a resolver returning `[]`) opt out of fallback entirely — the chain is just `[locale]` with no default-locale tail.
