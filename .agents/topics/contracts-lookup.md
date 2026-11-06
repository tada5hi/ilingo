# Lookup

## 1. Locale-first walk with fallback chain

`Ilingo.get(ctx)` resolves a locale **chain** before querying anything (`getResolvedLocaleChain`). The chain order is `[requested, ...explicit-or-BCP-47-parents, default]`, deduplicated, with `default` pinned at the terminal position so it cannot be reordered out by an earlier mention. The chain is walked locale-first: closer locale beats farther one *regardless of store insertion order*. The chain can be inspected via `getResolvedLocaleChain(ctx)`; the locale that actually yielded a value is reachable via `getResolvedLocale(ctx)`.


## 2. Serial store query within a locale

For each locale in the chain, the orchestrator walks the stores **serially in insertion order** and returns the first defined hit. Locale-order semantics still dominate (closer locale always wins, regardless of which store would have answered), and within a locale the walk stops the moment an earlier store answers — later stores never see the call. This is the contract that makes "local first, remote fallback" composition behave intuitively: registering a network-backed adapter after a Memory adapter never causes an HTTP request when the Memory adapter has the key.

Serial fallback latency accumulates across misses; an earlier hit prevents all later-store I/O. Keep the serial stop-on-hit contract.


## 3. Multi-store, symbol-keyed deduping

`Ilingo` holds a `Map<symbol | string, IStore>` — the store's own `id` is the key (its **identity**), and the Map's insertion order is the query order. `registerStore(store)` is the registration primitive, keyed by `store.id`: it is idempotent — a no-op (keeping the existing store) if a store with that `id` is already present. A store carries its own `id` (`MemoryStore` defaults to a fresh `Symbol(...)`; library catalogs use `Symbol.for('@scope/pkg')`), so anonymous stores always add while library catalogs dedupe. The constructor's `store` option routes through `registerStore`.

Library adapters register their catalog under a `Symbol.for('@scope/pkg')` global-registry symbol (`@ilingo/validup` → `Symbol.for('@ilingo/validup')`, `@ilingo/vuelidate` → `Symbol.for('@ilingo/vuelidate')`, each exported as `STORE_ID`). Because `Symbol.for` is identity-stable across module instances, re-registration — even from a duplicate package copy (pnpm / peer-dep mismatch) — collides on the same key and stays a no-op.

`merge(otherIlingo)` folds another instance's stores in, deduping by symbol key: a foreign key already present is skipped (existing store wins), foreign keys not present are appended in order. `Symbol.for`-keyed library catalogs never stack across a merge; anonymously-keyed stores (minted `Symbol()`) are always distinct and always carried over. `clone()` copies the parent's `(symbol, store)` entries preserving keys, so a later `merge` between a clone and its parent dedupes correctly.

**`namespace` is a shared key-space, not single-owner.** `MemoryStore.get()` returns `undefined` per *missing key*, so the orchestrator falls through store-by-store *within the same namespace*. An app therefore co-owns a library's namespace (e.g. `validup`): registering its own store **first** lets it add custom keys and override individual ones, while the library catalog (appended) supplies the built-in defaults for everything the app store misses. This is the canonical composition for "backend with its own translations + a validation library that ships its own."


## 3a. `IIlingo` contract

`types.ts` declares the public `IIlingo` interface that `Ilingo` implements. Higher-layer packages type against `IIlingo` (the Vue provide/inject layer — `provideIlingo`/`injectIlingo`/`injectIlingoSafe` — and the library helpers that accept an `IIlingo`, e.g. `translateIssue(issue, ilingo)`) so consumers can swap in alternative implementations without depending on the concrete class. The concrete `Ilingo` is still imported where an instance must be *constructed* (`new Ilingo()` in `applyInstallInput`); the `instanceof Ilingo` branch there was replaced with an `isIlingo(input)` guard (`'stores' in input`) so a non-concrete `IIlingo` is recognised.


## 4. Group/key/count model

Translations are addressed by `(locale, namespace, key)` plus an optional `count` for pluralization. The `namespace` is a logical, possibly **dotted** namespace — typically a filename when using `FSStore` (`packages/fs/src/module.ts` resolves `<directory>/<locale>/<namespace>.{js,mjs,cjs,ts,mts,json,conf}`, where a dotted namespace maps to a dotted filename, e.g. `app.nav.json`). The `key` is a `pathtrace`-style dotted path within that namespace's nested object.

The internal lookup shape every store resolves to is `Locales` = `Record<locale, Record<namespace, Translations>>`. Catalogs are *authored* as a descriptor tree (see §7) and **normalized** into this shape before lookup — `Locales`/`Namespaces`/`Translations`/`Leaf`/`PluralForms` are the normalized data-shape types, not the authoring surface.


## 5. Plural leaves: the `{ type: 'plural' }` node

A catalog leaf is either a plain `string` or a `PluralNode` (`{ type: 'plural', data: { zero?, one?, two?, few?, many?, other } }`, produced by `definePlural(forms)`). The inner CLDR-categorised `data` shape is exported as `PluralForms`. A `PluralNode` is the only signal that a value should be interpreted as a plural — a bare `{ one, other }` object inside a translations body is treated as an ordinary nested key path.

Only the tagged plural-node shape is interpreted as plural data. An `@plural` marker key is not supported.

The orchestrator selects a form using `Intl.PluralRules` keyed by the *resolved* locale (the one that actually matched). `Intl.PluralRules` instances are cached per locale on the `Ilingo` instance.
