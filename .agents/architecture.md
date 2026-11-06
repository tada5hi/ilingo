# Architecture

## Overview

ilingo follows a small **port-and-adapter** design:

- **Port**: `IStore` (`packages/ilingo/src/store/types.ts`) is the **read** contract — `id`, `get`, `getSync`, `getLocales` (ilingo reads a datasource; the orchestrator never writes). The read is required in *both* idioms, matching confinity's `IStore` and locter's `IReader`; an adapter that cannot read without I/O implements `getSync` by throwing `SyncUnavailableError` (`throwSyncUnavailable`). Writing is the opt-in `IMutableStore` (`set`); `MemoryStore` additionally exposes concrete `setSync` / `getLocalesSync` for in-memory seeding without `await` (those two are store-specific, not port members).
- **Adapters**: `MemoryStore` (default, in-memory; implements `IMutableStore`) and `FSStore` (lazy-loads files from disk, persists `set()` to JSON) implement the port.
- **Orchestrator**: `Ilingo` (`packages/ilingo/src/module.ts`, implementing the `IIlingo` interface) holds a `Map<symbol, IStore>` plus per-instance state for the locale, fallback chain, missing-key handler, plural-rules cache, and warn-once memo. On each `get()` it walks a resolved locale chain in order; within each locale it queries stores **serially in insertion order** and stops at the first hit.
- **Public contract**: `IIlingo` is the orchestrator's interface — every method on `Ilingo` plus the `stores` map and `formatters` registry. Neither `Ilingo` nor `IIlingo` is generic in the catalog (`class Ilingo implements IIlingo`); `get`/`getResolvedLocale` take a loose `GetContext` and return `Promise<string | undefined>`. Higher-layer packages (`@ilingo/vue`, `@ilingo/vuelidate`, `@ilingo/validup`, …) accept and return `IIlingo` in type positions so consumers can swap test doubles or decorating wrappers without depending on the concrete class. Construction still goes through the `Ilingo` class; runtime discrimination uses structural duck-typing (`'stores' in input`) so non-concrete `IIlingo` implementations are still recognised by `@ilingo/vue`'s `applyInstallInput`.

Higher-layer packages (`@ilingo/vue`, `@ilingo/vuelidate`) wrap the orchestrator for a specific framework — Vue's `provide`/`inject` makes the `IIlingo` instance and locale `Ref` available to descendants of the app root.

## Core Design Decisions

### 1. Locale-first walk with fallback chain

`Ilingo.get(ctx)` resolves a locale **chain** before querying anything (`getResolvedLocaleChain`). The chain order is `[requested, ...explicit-or-BCP-47-parents, default]`, deduplicated, with `default` pinned at the terminal position so it cannot be reordered out by an earlier mention. The chain is walked locale-first: closer locale beats farther one *regardless of store insertion order*. The chain can be inspected via `getResolvedLocaleChain(ctx)`; the locale that actually yielded a value is reachable via `getResolvedLocale(ctx)`.

### 2. Serial store query within a locale

For each locale in the chain, the orchestrator walks the stores **serially in insertion order** and returns the first defined hit. Locale-order semantics still dominate (closer locale always wins, regardless of which store would have answered), and within a locale the walk stops the moment an earlier store answers — later stores never see the call. This is the contract that makes "local first, remote fallback" composition behave intuitively: registering a network-backed adapter after a Memory adapter never causes an HTTP request when the Memory adapter has the key.

Trade-off accepted: when every registered store *would* have hit, total latency is `sum(per-store latency)` rather than `max(per-store latency)`. Pre-stable history kept this as a `Promise.all` parallel walk; it was flipped to serial-on-miss in [#917 Track B](plans/007-stability-roadmap.md) so the default composition matches user intuition. Speculative concurrency was rarely useful in practice — the in-tree adapters are sync after their first warm-up — and the parallel default was an active footgun for network-backed adapters.

### 3. Multi-store, symbol-keyed deduping

`Ilingo` holds a `Map<symbol | string, IStore>` — the store's own `id` is the key (its **identity**), and the Map's insertion order is the query order. `registerStore(store)` is the registration primitive, keyed by `store.id`: it is idempotent — a no-op (keeping the existing store) if a store with that `id` is already present. A store carries its own `id` (`MemoryStore` defaults to a fresh `Symbol(...)`; library catalogs use `Symbol.for('@scope/pkg')`), so anonymous stores always add while library catalogs dedupe. The constructor's `store` option routes through `registerStore`.

Library adapters register their catalog under a `Symbol.for('@scope/pkg')` global-registry symbol (`@ilingo/validup` → `Symbol.for('@ilingo/validup')`, `@ilingo/vuelidate` → `Symbol.for('@ilingo/vuelidate')`, each exported as `STORE_ID`). Because `Symbol.for` is identity-stable across module instances, re-registration — even from a duplicate package copy (pnpm / peer-dep mismatch) — collides on the same key and stays a no-op. This replaced an earlier `instanceof Store` scan, which double-registered across duplicate copies and couldn't dedupe app-seeded stores.

`merge(otherIlingo)` folds another instance's stores in, deduping by symbol key: a foreign key already present is skipped (existing store wins), foreign keys not present are appended in order. `Symbol.for`-keyed library catalogs never stack across a merge; anonymously-keyed stores (minted `Symbol()`) are always distinct and always carried over. `clone()` copies the parent's `(symbol, store)` entries preserving keys, so a later `merge` between a clone and its parent dedupes correctly.

**`namespace` is a shared key-space, not single-owner.** `MemoryStore.get()` returns `undefined` per *missing key*, so the orchestrator falls through store-by-store *within the same namespace*. An app therefore co-owns a library's namespace (e.g. `validup`): registering its own store **first** lets it add custom keys and override individual ones, while the library catalog (appended) supplies the built-in defaults for everything the app store misses. This is the canonical composition for "backend with its own translations + a validation library that ships its own."

### 3a. `IIlingo` contract

`module.ts` exports an `IIlingo` interface that `Ilingo` implements. Higher-layer packages type against `IIlingo` (the Vue provide/inject layer — `provideIlingo`/`injectIlingo`/`injectIlingoSafe` — and the library helpers that accept an `IIlingo`, e.g. `translateIssue(issue, ilingo)`) so consumers can swap in alternative implementations without depending on the concrete class. The concrete `Ilingo` is still imported where an instance must be *constructed* (`new Ilingo()` in `applyInstallInput`); the `instanceof Ilingo` branch there was replaced with an `isIlingo(input)` guard (`'stores' in input`) so a non-concrete `IIlingo` is recognised.

### 4. Group/key/count model

Translations are addressed by `(locale, namespace, key)` plus an optional `count` for pluralization. The `namespace` is a logical, possibly **dotted** namespace — typically a filename when using `FSStore` (`packages/fs/src/module.ts` resolves `<directory>/<locale>/<namespace>.{js,mjs,cjs,ts,mts,json,conf}`, where a dotted namespace maps to a dotted filename, e.g. `app.nav.json`). The `key` is a `pathtrace`-style dotted path within that namespace's nested object.

The internal lookup shape every store resolves to is `Locales` = `Record<locale, Record<namespace, Translations>>`. Catalogs are *authored* as a descriptor tree (see §7) and **normalized** into this shape before lookup — `Locales`/`Namespaces`/`Translations`/`Leaf`/`PluralForms` are the normalized data-shape types, not the authoring surface.

### 5. Plural leaves: the `{ type: 'plural' }` node

A catalog leaf is either a plain `string` or a `PluralNode` (`{ type: 'plural', data: { zero?, one?, two?, few?, many?, other } }`, produced by `definePlural(forms)`). The inner CLDR-categorised `data` shape is exported as `PluralForms`. A `PluralNode` is the only signal that a value should be interpreted as a plural — a bare `{ one, other }` object inside a translations body is treated as an ordinary nested key path.

The descriptor `{ type: 'plural' }` node **replaces** the previous `@plural` JSON marker outright — there is no `@plural` key and no `PluralLeaf` wrapper type anymore. The single tagged-node form keeps authoring (TS via `definePlural()`, JSON via the literal `{ "type": "plural", "data": { … } }`) and the normalized internal shape consistent, and avoids the earlier collision (#917 Track B) between a marker key and sibling keys named after CLDR categories. Since pluralization had never shipped a stable release, the marker form was removed rather than deprecated.

The orchestrator selects a form using `Intl.PluralRules` keyed by the *resolved* locale (the one that actually matched). `Intl.PluralRules` instances are cached per locale on the `Ilingo` instance.

### Synchronous read path (`getSync`)

`Ilingo.get()` is always a `Promise`, which breaks server-side rendering: `@ilingo/vue`'s `computedAsync` has to render *something* first, that placeholder lands in the SSR markup, and the client's first render then mismatches it (#988). `getSync(ctx)` is the synchronous counterpart — same locale chain, same serial store order, same plural/interpolation/`onMissingKey` handling.

**The read is required in both idioms.** `getSync` is part of `IStore` and of `IIlingo`, not an opt-in capability:

```typescript
export interface IStore {
    readonly id: string | symbol;
    get(context: StoreGetContext): Promise<Leaf | undefined>;
    getSync(context: StoreGetContext): Leaf | undefined;   // throws SyncUnavailableError
    getLocales(): Promise<string[]>;
}
```

**Two outcomes, not three.** A synchronous read either produces a value (`Leaf` for a hit, `undefined` for a definite miss) or throws — which is exactly the pair the asynchronous read has as resolve-or-reject. An earlier iteration returned a `SYNC_UNAVAILABLE` sentinel; it was dropped because it invented a third outcome async has no analogue for, and it shared a channel with `undefined`. Callers *must* separate "no such key" from "ask me later": the first wants a fallback (`issue.message`, the rule name, the `namespace.key` placeholder), the second must not fall back at all, because the async pass is about to produce a real translation. Dropping the sentinel also un-widened `MemoryStore.getSync`'s return type, which had only widened so `FSStore` could override it.

`SyncUnavailableError` lives in `src/errors/` alongside an `IlingoError` base, following the convention in the sibling packages (`LocterError` in locter, `ValidupError` in validup, `ConfinityError` in confinity): a base class per library, subclasses carrying structured fields (here `locale` / `namespace` / `key` / `storeId`), and **`Symbol.for` markers plus a `[Symbol.hasInstance]` override** so `instanceof` survives duplicate package copies — the same motivation that makes library catalog stores key themselves with `Symbol.for('@scope/pkg')`. `IlingoError` extends **`@ebec/core`'s `BaseError`** (see below). Use `isSyncUnavailableError` at any boundary where the error may cross copies (thrown inside `@ilingo/fs`, caught in an app).

`Ilingo.lookupSync` mirrors `lookup` and lets a store's throw unwind untouched — no capability branch, and the error already names the store and lookup that declined. Aborting *at* the declining store rather than skipping it is what keeps the result equivalent to the async walk: everything before it answered identically, and nothing after it can be consulted without knowing what the decliner would have said. Hence the contract: **when `getSync` returns, it equals `await get()`**; when it can't guarantee that, it throws.

Implementations:

| Store | `getSync` |
|---|---|
| `MemoryStore` | always answers; never throws `SyncUnavailableError` |
| `LoaderStore` | cache-only — throws for an unloaded pair; does **not** start a load. A cached loader-miss is a definite miss |
| `FSStore` | **reads the file synchronously** via locter's `locateManySync` / `readAsModuleSync`, cold or warm; throws only for a module that needs an asynchronous `import()` (a malformed file propagates its real parse error) |
| async-only adapter (HTTP/DB) | `getSync(context) { throwSyncUnavailable(context, this.id); }` |

`MemoryStore` keeps the map lookup in a protected `resolve()` that both `get` and `getSync` delegate to (same shape as confinity's `Store.resolve`). `get` must **not** route through the overridable `getSync`: `FSStore` overrides `getSync` to decline, and an async `get` that inherited that refusal threw for a namespace it had just chosen not to cache.

**`onMissingKey` fires on both paths.** Required by the equivalence guarantee — a handler-substituted string has to be identical for the seed and the async pass. Consequence: a seeding consumer reaches the handler twice per missing key. The built-in default is unaffected (`warnedKeys` is shared, so one warning total); a consumer handler with side effects must dedupe itself, which the missing-key guide documents.

`@ilingo/vue` consumes it through one helper (`composables/utils.ts` → `resolveSync`). It never throws: a `SyncUnavailableError` is expected control flow (nothing to seed), and any *other* error is swallowed too — the lookup runs on the synchronous setup path where an escaping throw aborts the mount — but reported once in dev, because the async pass hands the same error to VueUse's `onError` → `globalThis.reportError`, which is absent under Node SSR and would otherwise lose it exactly where it matters. All four async translation surfaces seed from it: `useTranslation`, `<ITranslateT>`, `useScopedCatalog().t`, and `<ITranslate>` (via `useTranslation`). The `v-t` directive is unchanged — Vue SSR does not execute directives without `getSSRProps`, and there is no `getSSRProps` shape for text content.

#### Seeding the validation-message layers

`@ilingo/validup` mirrors its three async helpers with `translateIssueSync` / `translateIssuesSync` / `translateIssueGroupsSync`, and `@ilingo/validup-vue` + `@ilingo/vuelidate` use them (resp. `instance.getSync?.()`) to seed their own `computedAsync`s.

These layers are the reason the core separates the two failure modes instead of collapsing them into one `undefined`. A code with no catalog entry must fall back to `issue.message` (exactly what the async path does), while a store that merely needs I/O must **not** — the async pass is about to produce a real translation, and falling back now would be a message that changes under the user, i.e. the very SSR mismatch class being fixed.

With a definite miss reported as `undefined` and unavailability thrown, `translateIssueSync` applies the async path's own fallback for the first case and returns `undefined` only for the second. An unexpected error (a broken store or formatter) is **re-thrown**, not masked as "unavailable". The batch helpers stay **all-or-nothing** — a batch where some messages are real and others placeholders that flip a tick later is harder to reason about, and a mismatch risk across an SSR boundary — but that now triggers rarely, since the only cause is a store needing I/O, which applies to every issue in the batch equally. `@ilingo/vuelidate`'s `useTranslationsForBaseValidation` applies the same rule per rule-name record (`value || rule`, matching its async body).

### Errors build on `@ebec/core`'s `BaseError`

`IlingoError extends BaseError`, the same base `LocterError` (locter) and `ValidupError` (validup) use, so an ilingo error carries a `code` (derived from the class name — `SyncUnavailableError` → `SYNC_UNAVAILABLE_ERROR`), a `cause`, and a `toJSON()`, and answers `@ebec/core`'s `isBaseError()` alongside the rest of the family. `SyncUnavailableError` overrides `toJSON()` to add its own `locale` / `namespace` / `key` / `storeId` (the last stringified, since a store `id` is usually a symbol).

The marker protocol is `@ebec/core`'s: each class declares a `Symbol.for(...)` marker and calls `markInstanceof(this, MARKER)`, so an instance accumulates its ancestors' markers on one non-enumerable `@instanceof` chain and a parent-class guard matches a subclass instance. This **replaced** ilingo's hand-rolled flat-symbol-property marker. Two things it buys beyond the dedup: `BaseError.toJSON()` re-emits the chain as strings, so identity survives a JSON round-trip (symbols don't serialise), and the whole family now shares one protocol.

The guards — `isIlingoError` / `isSyncUnavailableError` — live together in `errors/check.ts` (mirroring `@ebec/core`'s own `helpers/check.ts`), each a one-line `matchesInstanceof(input, MARKER)`, and each class's `[Symbol.hasInstance]` override delegates to its guard so `instanceof` and the guard can never disagree. The markers sit in `errors/constants.ts` rather than beside their classes: `check.ts` needs them and the classes need `check.ts` back for `[Symbol.hasInstance]`, so keeping them in a leaf module is what stops that from being a runtime import cycle. This matches `isBaseError` / `isValidupError` in the sibling packages. Prefer the guard: it matches every subclass through the shared chain and recognises an error rehydrated from `toJSON()`, which no `instanceof` can.

Markers use the family's `<pkg>/<ClassName>` key convention — `Symbol.for('ilingo/IlingoError')`, `Symbol.for('ilingo/SyncUnavailableError')`, alongside `@ebec/core/BaseError` and `validup/ValidupError` — exported as `ILINGO_ERROR_INSTANCE` / `SYNC_UNAVAILABLE_ERROR_INSTANCE`.

ilingo's own `markError` / `hasErrorMarker` helpers were **removed** rather than kept as passthroughs: `@ebec/core` exports `markInstanceof` / `hasInstanceof` / `matchesInstanceof` and is now a direct dependency, so a consumer that wants them imports them from there. One consequence is deliberate: the marker *format* changed (flat symbol property → `@instanceof` chain), and no compatibility shim reads the old one, so an error thrown by a duplicate copy pinned to ilingo ≤ 6.1 is not recognised by this build's guards. The window is narrow — the flat format only ever shipped in 6.0–6.1, alongside `getSync` itself.

This reverses the earlier decision to keep `@ebec/core` out of core for bundle weight. It is not free: the full barrel went 6.55 → 7.18 kB and `Ilingo + MemoryStore` 4.19 → 4.84 kB, so both budgets moved (6.75 → 7.5 kB, 5 → 5.5 kB). The two tree-shake-floor entries (`defineCatalog`, `negotiateLocale + parseAcceptLanguage`) are **unchanged** at 1.12 / 1.48 kB — `@ebec/core` drops out cleanly for a slice that never touches an error, so the cost lands only on consumers who pull the error surface in.

### Cache invalidation

Stores that cache lookups implement `IInvalidatingStore extends IStore`:

```typescript
export interface IInvalidatingStore extends IStore {
    invalidate(locale?: string, namespace?: string): void;
    on(event: 'invalidate', listener: (locale?, namespace?) => void): () => void;
}
```

`invalidate(...)` drops scoped cache entries (`()` = everything, `(locale)` = all namespaces, `(locale, namespace)` = one). The `on('invalidate')` event fires after the cache is dropped — subscribers see the post-invalidate state.

Both `LoaderStore` (core) and `FSStore` (`@ilingo/fs`) implement it. Detect at runtime via `isInvalidatingStore(store)` — the type guard checks for both `invalidate` and `on` methods.

`@ilingo/vue`'s `useTranslation` walks `instance.stores` at composable-setup time, subscribes to every `IInvalidatingStore`, and bumps an internal trigger ref on `invalidate` events that match the current `(locale, namespace)`. The `computedAsync` reads the ref in its dep set, so the re-fetch happens automatically. Unsubscribes are wired to `onScopeDispose`.

### `LoaderStore`

`packages/ilingo/src/store/loader.ts`. Lazy-loaded store backed by a user-supplied `loader(locale, namespace) => Promise<Translations | undefined>`. Caches per `(locale, namespace)` so the loader is called at most once per pair until `invalidate()` is called. De-duplicates concurrent `get()`s for the same pair via an in-flight map.

Misses (loader returning `undefined`) are cached too — the loader isn't re-called for known-missing pairs. Designed for browser code-splitting: typical loader is `(l, g) => import(\`./locales/${l}/${g}.json\`).then(m => m.default)`.

`getLocales()` returns the declared `locales: string[]` option when provided; otherwise the set of locales seen so far (best-effort).

### `FSStore` load bookkeeping

Both load paths are generated from **one** body (`readNamespaceBody`) via the [`twinop`](https://github.com/tada5hi/twinop) package: a generator yields `op(asyncThunk, syncThunk)` pairs and two drivers (`runTwinAsync` / `runTwinSync`) execute the side they stand for, re-entering effect errors with `Generator.throw` so `try`/`catch` behaves identically in both. The point is not the I/O — it is everything *around* it (the loaded flag, the in-flight dedup, the generation guard, the merge order), which two hand-written copies would let drift until `get` and `getSync` disagreed. That drift is exactly the bug class this feature kept hitting; one body cannot drift from itself. The protocol is a dependency, not vendored code: `locter` and `validup` drive their own twins with the same package.

`loadNamespace` sets the `loaded` flag **after** the file data is merged, not before, and de-duplicates concurrent callers through a `loading` map keyed by `(locale, namespace)`. Both details are load-bearing for the sync path: `isLoaded` has to mean "the data is here", or `getSync` would report a definite miss during the in-flight window and let the orchestrator resolve a farther locale that the pending read is about to contradict.

Setting the flag eagerly was also a pre-existing async bug (found while auditing #988): a second concurrent `get()` short-circuited on the flag, read the still-empty record, and resolved to `undefined`. The in-flight map fixes both.

`loadNamespaceSync` is the public sync twin — it primes the store without an `await`, and `getSync` uses it for a cold namespace. It cannot await a load already in flight asynchronously, so it re-reads instead; both writes produce the same merged record, making the duplicate work wasteful but never inconsistent.

`invalidate()` bumps a `generation` counter that a read captures at its start; a read whose generation changed discards its result instead of repopulating a cache the consumer just dropped. Same guard as `LoaderStore` — and it matters more now that the flag is set at the end, since a stale write would otherwise also mark the namespace loaded.

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
- Exposes `register(name, fn)` / `get(name)` publicly. Two ergonomic entry points sit on `Ilingo`: `registerFormatter(name, fn)` (delegates to the registry) and `IlingoOptions.formatters` (constructor-time bulk registration). Names registered via either surface override the built-ins if they collide.

The locale handed to a formatter is the **resolved** locale (the one that actually yielded the message), not the requested one. Unknown modifiers fall back to `String(value)` and emit a per-instance dev-mode one-shot warning via the same `isProductionEnv()` gate used by the missing-key handler.

`clone()` shares the formatter registry by reference — custom formatters registered on either side are visible to both. Callers that need isolation should build the child instance directly.

### 7. Catalog descriptor tree + shared normalizer

Catalogs are authored as a **tree of tagged descriptor nodes**. `Ilingo` uses an open-world store model: API- and loader-backed stores can hold keys that do not exist at build time. `get(ctx: GetContext)` takes a loose context and returns `string | undefined`.

#### Node grammar

The builders live in `packages/ilingo/src/catalog.ts` and produce tagged nodes:

- `defineCatalog(locales: LocaleNode[])` → `{ type: 'catalog', data }` — the root.
- `defineLocale(name, children)` → `{ type: 'locale', name, data }`.
- `defineNamespace(name, children)` → `{ type: 'namespace', name, data }`.
- `defineTranslations(obj)` → `{ type: 'translations', data }` — flat or key-nested translation strings/plurals.
- `definePlural(forms)` → `{ type: 'plural', data }` — a plural leaf inside a translations body.

```text
CatalogNode   = { type:'catalog',   data: LocaleNode[] }
LocaleNode    = { type:'locale',    name, data: (NamespaceNode | TranslationsNode)[] }
NamespaceNode = { type:'namespace', name, data: (NamespaceNode | TranslationsNode)[] }
TranslationsNode     = { type:'translations',     data: Translations }        // Translations leaves: string | PluralNode | nested Translations
PluralNode    = { type:'plural',    data: PluralForms }
```

Two independent nesting hierarchies:

- A nested **`NamespaceNode`** extends the dotted **namespace** (`app` ▸ `nav` → `'app.nav'`).
- A nested object inside a **`TranslationsNode`** extends the dotted **key** (`{ nav: { home } }` → key `'nav.home'`).

A `TranslationsNode` placed directly under a `LocaleNode` is routed to the default namespace (`''`) by `normalizeCatalog` — the seam for a future optional-namespace API (ergonomics still provisional).

`definePlural` keeps **local** CLDR-category autocomplete and a compile error on missing-`other` / non-CLDR keys (its argument is typed `PluralForms`) — this validation is independent of any catalog-wide inference and survives the type-safe-keys removal.

#### Shared normalizer

`packages/ilingo/src/catalog/normalize.ts` is the single reducer that turns the authoring tree into the internal `Locales` lookup shape every store consumes. Exported from the barrel (`src/index.ts`):

- `normalizeCatalog(input: CatalogInput): Locales` — folds the tree, flattening nested `NamespaceNode`s into dotted namespace keys and merging sibling nodes.
- `normalizeNamespaceBody(body: NamespaceBodyInput): Translations` — reduces a single translations node into a `Translations` record.

`CatalogInput = CatalogNode | LocaleNode[] | LocaleNode` (the root accepts a built `defineCatalog(...)` node, a bare array of locale nodes, or a single locale node). `NamespaceBodyInput = TranslationsNode`.

Every store ingests the tree through this reducer:

- `MemoryStore({ data })` takes a `CatalogInput` and runs `normalizeCatalog` in its constructor. The legacy plain `{ locale: { ns: {…} } }` object is **not accepted** as input.
- `LoaderStore`'s loader returns a `NamespaceBodyInput` (a translations node); `normalizeNamespaceBody` reduces it per `(locale, namespace)`.
- `@ilingo/fs` files are translations nodes — JSON `{ "type": "translations", "data": {…} }`, or `export default defineTranslations({…})`; `persist()` writes `{ type: 'translations', data }`. `FSStore.mergeFiles` uses `isTranslationsNode` + `normalizeNamespaceBody` (the old `isLineRecord` path is gone).

### 8. ESM-first, dependency-light, browser-safe

Each package's runtime dependencies are minimal — `@ebec/core`, `pathtrace` and `smob` in core; `locter`, `pathe`, `smob` in `@ilingo/fs`; `@ebec/core` in the two validup packages (see below). Vue and Vuelidate are declared as `peerDependencies`, not bundled. Core does not import `node:process` — `NODE_ENV` is read via a bare `process.env.NODE_ENV` literal (so Vite / Webpack DefinePlugin can replace it) wrapped in a `typeof process !== 'undefined'` guard for raw-browser execution.


## Detailed topics

- [Design Patterns](topics/architecture-design-patterns.md)
- [Data Flow](topics/architecture-data-flow.md)
- [Error Handling](topics/architecture-error-handling.md)
- [File Structure (architectural layers)](topics/architecture-file-structure-architectural-layers.md)
- [Configuration](topics/architecture-configuration.md)
