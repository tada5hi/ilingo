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

`SyncUnavailableError` lives in `src/errors/` alongside an `IlingoError` base, following the convention in the sibling packages (`LocterError` in locter, `ConfinityError` in confinity): a base class per library, subclasses carrying structured fields (here `locale` / `namespace` / `key` / `storeId`), and **`Symbol.for` markers plus a `[Symbol.hasInstance]` override** so `instanceof` survives duplicate package copies — the same motivation that makes library catalog stores key themselves with `Symbol.for('@scope/pkg')`. The `@ebec/core` base used by locter is deliberately *not* pulled in: core ships to browsers under a bundle-size budget and this is its only error class. Use `isSyncUnavailableError` at any boundary where the error may cross copies (thrown inside `@ilingo/fs`, caught in an app).

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

Catalogs are authored as a **tree of tagged descriptor nodes**, not a plain nested object. There is no closed-world key inference: type-safe keys via a generic `Ilingo<Catalog>` were **removed**. The rationale: a closed-world key type was a poor fit for ilingo's open-world store model — API- and loader-backed stores hold keys that don't exist at build time, so an exhaustive key union was never sound. It also only ever constrained *inputs* (the return type was always `string | undefined` regardless), so the high type-machinery maintenance cost bought little. `Ilingo` is no longer generic; `get(ctx: GetContext)` takes a loose context.

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

- `MemoryStore({ data })` takes a `CatalogInput` and runs `normalizeCatalog` in its constructor. The legacy plain `{ locale: { ns: {…} } }` object is **no longer accepted** as input.
- `LoaderStore`'s loader returns a `NamespaceBodyInput` (a translations node); `normalizeNamespaceBody` reduces it per `(locale, namespace)`.
- `@ilingo/fs` files are translations nodes — JSON `{ "type": "translations", "data": {…} }`, or `export default defineTranslations({…})`; `persist()` writes `{ type: 'translations', data }`. `FSStore.mergeFiles` uses `isTranslationsNode` + `normalizeNamespaceBody` (the old `isLineRecord` path is gone).

### 8. ESM-first, dependency-light, browser-safe

Each package's runtime dependencies are minimal — `pathtrace` and `smob` in core; `locter`, `pathe`, `smob` in `@ilingo/fs`. Vue and Vuelidate are declared as `peerDependencies`, not bundled. Core does not import `node:process` — `NODE_ENV` is read via a bare `process.env.NODE_ENV` literal (so Vite / Webpack DefinePlugin can replace it) wrapped in a `typeof process !== 'undefined'` guard for raw-browser execution.

## Design Patterns

### Store Pattern (port + adapter)

Port — `packages/ilingo/src/store/types.ts`:

```typescript
export type StoreGetContext = { locale: string, namespace: string, key: string };
export type StoreSetContext = StoreGetContext & { value: string | PluralNode };

// ilingo is read-first: the orchestrator only ever calls get/getLocales.
export interface IStore {
    readonly id: string | symbol;
    get(context: StoreGetContext): Promise<Leaf | undefined>;
    getLocales(): Promise<string[]>;
}

// Writing is an opt-in capability (mirrors IInvalidatingStore). Implemented
// by MemoryStore + FSStore; extendStore() takes a IMutableStore.
export interface IMutableStore extends IStore {
    set(context: StoreSetContext): Promise<void>;
}
export function isMutableStore(store: IStore): store is IMutableStore;

```

Adapter — `packages/ilingo/src/store/memory.ts`. The constructor normalizes the `CatalogInput` tree into `Locales`; `get` unwraps a `PluralNode` to its inner `data` (a bare `{ one, other }` object is a nested key path, not a plural):

```typescript
async get(ctx: StoreGetContext): Promise<Leaf | undefined> {
    const namespace = this.data[ctx.locale]?.[ctx.namespace];
    if (!namespace) return undefined;
    const out = getPathValue(namespace, ctx.key);
    if (typeof out === 'string') return out;
    if (isPluralNode(out)) return out.data;
    return undefined;
}
```

Conventions:

- New stores **implement `IStore`** rather than extending `MemoryStore` unless they want the in-memory cache (`FSStore` extends it, using the parent map as a load cache).
- All methods are async, even when synchronous — keep that contract; `Ilingo.lookup` `await`s every store call.
- A miss is `undefined`. Do not throw on miss; that breaks the fallback walk.
- Returning `PluralForms` (the unwrapped inner shape) is allowed but optional — string-only stores remain valid. Custom stores that hold raw `PluralNode` (`{ type: 'plural', data: … }`) values should unwrap to `.data` before returning, matching `MemoryStore` / `LoaderStore`.

### Orchestrator Pattern (`Ilingo`)

```typescript
async get(ctx: GetContext): Promise<string | undefined> {
    const requestedLocale = ctx.locale ?? this.getLocale();
    const chain = this.getResolvedLocaleChain({ locale: requestedLocale });

    const hit = await this.lookup(chain, ctx);
    return hit ?
        this.render(hit.leaf, hit.locale, ctx) :
        this.handleMissingKey(ctx, requestedLocale, chain);
}

// The post-lookup half of get(): plural-form selection + count auto-merge
// into data + {{var}} substitution against the resolved locale.
protected render(leaf: Leaf, locale: string, ctx: GetContext): string {
    const message = this.selectPluralForm(leaf, locale, ctx.count);
    const data: Data = { ...(ctx.data || {}) };
    if (typeof ctx.count === 'number' && typeof data.count === 'undefined') {
        data.count = ctx.count;
    }
    return this.format(message, data, locale);
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

`IlingoOptions.onMissingKey?: (ctx) => string | undefined`. Invoked when the chain × stores walk exhausts without a hit. Receives a `MissingKeyContext` carrying the *resolved* `locale` (never undefined) plus `resolvedLocale` = the chain terminator. Returning a string makes that string the result of `get()`; returning `undefined` keeps the result `undefined`.

If `onMissingKey` is not configured, the built-in default warns once per `(requestedLocale, namespace, key)` per instance, silenced when `process.env.NODE_ENV === 'production'`. The warn-once set is per-instance so multiple `Ilingo` instances don't dedupe each other's warnings.

### Vue Plugin Pattern

`@ilingo/vue` exposes `install(app, input)` and a default `Plugin` object. `applyInstallInput` is the heart of it — idempotent and merge-aware:

1. Read any already-`provide`d `Ilingo` instance and locale `Ref` from the app.
2. Resolve the new `input`: nothing → fresh `Ilingo`; an `Ilingo` → merge into existing or use directly; an `Options { store, locale }` → add the store to the existing instance or create one.
3. Provide the instance and locale only if they were not provided before — so calling `install` more than once does not clobber existing wiring.

`useTranslation(ctx)` forwards `count` as `MaybeRef<number>` (unwrapped via `unref`) so plural selection is reactive to count changes the same way `data` is.

`@ilingo/vuelidate` chains this: it calls `applyInstallInput`, then registers its own catalog store via `instance.registerStore(createMemoryStore())` (a `MemoryStore` pre-loaded with EN/DE/FR/ES validator translations). The store is keyed by `STORE_ID = Symbol.for('@ilingo/vuelidate')`, so `registerStore` is idempotent — repeated installs (or a duplicate package copy) collide on the same key and stay a no-op rather than stacking.

### Slot-aware rendering — `<ITranslateT>` + `tokenize()`

`<ITranslateT>` extends `<ITranslate>` with **slot placeholders**: a message can contain `{slot}` markers (single curly) alongside the usual `{{var}}` interpolations (double curly). The component renders each slot from a named scoped slot, producing inline VNodes (links, bold runs, icons) without splitting the message across keys.

Core support lives in `packages/ilingo/src/utils/template.ts` as a separate `tokenize(str): TemplateToken[]` function. Tokens are `text` / `var` / `slot`. The plain `template()` function continues to return a string (used by `Ilingo.format`); the tokenizer is for renderers that produce structured output. `template()` and `tokenize()` share no state — they're parallel parsers over the same syntax.

### `v-t` directive

`packages/vue/src/directives/t.ts` exposes a `createVTDirective(instance, localeRef)` factory. Registered by `install()` on the Vue app under the name `t`, opt-out via `Options.directives: false`. The directive writes the translation to the element's `textContent` and uses `watchEffect` to track the locale Ref — locale changes update the element in place, no remount required. A stop-handle is stashed on the element via a `Symbol.for('ilingo.v-t.stop')` key so the directive can cancel the effect on unmount and re-subscribe on update.

### Scoped catalogs — `useScopedCatalog`

Creates a fresh `Ilingo` instance with a `MemoryStore` for the scoped messages registered *first* (scoped strings win), then re-adds every store from the parent instance (non-scoped keys still fall through). Calls `provideIlingo(scoped)` so the component subtree sees the scoped instance via plain `useTranslation`. Returns `{ instance, t }` for same-component use, since Vue's provide can't reach the current setup's own injections.

### `@ilingo/validup-vue` — composables are `setup()`-only; `<IFieldValidation>` for templates

Every reactive composable in `@ilingo/validup-vue` ultimately wires a VueUse `computedAsync`, which registers a `watchEffect` in the **active effect scope at call time**. The contract is therefore: **call these composables from `setup()`**, where the active scope is the component scope — the watcher is created once and disposed on unmount. The `<IValidup>` / `<IValidupT>` components and all the `useTranslations*` composables already follow this.

The trap (#965) is calling a composable from the **render** function. Empirically (Vue 3.5, verified by probe) the active effect scope during render is **`undefined`**, so a render-created `computedAsync` watcher belongs to no scope and Vue **never disposes it** — not between renders (it accumulates → unbounded self-amplifying list that hangs the page on the second keystroke) and **not on unmount** (each leaked watcher stays subscribed to the long-lived injected locale ref forever). `useFieldValidation` was the one composable *documented* to be used inline in the template (`:validation="useFieldValidation(...)"`), which is exactly this trap.

The fix moves the lifecycle into a **renderless component** rather than papering over the render-time call:

- `useFieldValidation` (`use-field-validation.ts`) is now a plain `setup()`-time composable — no cache, no scope plumbing. Used from `setup()` it is leak-free by construction.
- `<IFieldValidation>` (`component-field-validation.ts`) is the template-only path. It calls `useFieldValidation(toRef(props, 'field'))` in its **own** `setup()`, so the watcher lives in that component's scope — created once, disposed on the component's unmount. The default scoped slot exposes the bundle as `value` (`<IFieldValidation :field v-slot="{ value }">`). Each `<IFieldValidation>` instance is its own component, so two of them over the same `FieldState` never share a watcher. This mirrors the existing `<IValidup>` / `<IValidupT>` renderless pattern — the package's established answer to "translation needs a lifecycle."

A per-`(component, field)` memoization cache (keyed by `getCurrentInstance()`, watcher in an `effectScope` torn down via `onUnmounted`) was prototyped and rejected: it works, but it relies on render-time `getCurrentInstance()` (undocumented) and a module-level `WeakMap`, where the renderless component achieves the same lifetime guarantees with only public, idiomatic Vue. A *module-global* cache keyed only by `FieldState` was rejected outright — the single surviving watcher outlives its creating component and is shared across components, re-introducing both the unmount leak and cross-component staleness.

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

`getSync(ctx)` runs the identical pipeline with step 3 replaced by `lookupSync`
(same order; a store's `SyncUnavailableError` aborts the walk) and returns
`string | undefined` directly — no Promise. An aborted walk skips step 4
entirely (no `onMissingKey`, no warning) and yields `undefined`.

## Error Handling

- Misses return `undefined`. They are never errors.
- `FSStore.loadNamespace` short-circuits the "already loaded" case (`isLoaded` guard) and shares one read between concurrent callers (`loading` map).
- File-loading errors from `locter`/`load` propagate. There is no project-wide error wrapper.
- `template()` does **not** error on a missing data key — the `{{var}}` stays in the output.
- Vue's `useTranslation` falls back to `"${namespace}.${key}"` when `Ilingo.get` returns `undefined` (the orchestrator's `onMissingKey` runs first and may substitute) — and uses the same fallback for its synchronous seed when `getSync` can't answer.

## File Structure (architectural layers)

```text
packages/ilingo/src/
├── module.ts                ← orchestrator (Ilingo class)
├── store/{types,memory}     ← port + default adapter
├── catalog.ts               ← defineCatalog / defineLocale / defineNamespace / defineTranslations / definePlural node builders
├── catalog/normalize.ts     ← normalizeCatalog(CatalogInput) → Locales; normalizeNamespaceBody(NamespaceBodyInput) → Translations (shared reducer)
├── utils/
│   ├── locale.ts            ← bcp47Parents, resolveLocaleChain
│   ├── negotiate.ts         ← negotiateLocale, parseAcceptLanguage (request-side locale picking)
│   ├── identify.ts          ← isPluralNode + node guards isTranslationsNode/isNamespaceNode/isLocaleNode/isCatalogNode, isPluralForms (inner-shape guard)
│   ├── formatters.ts        ← FormatterRegistry (with public register/get), parseFormatterOptions, parseModifier, Formatter type
│   ├── template.ts          ← {{var}} + {{var, formatter(opts)}} substitution; tokenize() for slot-aware renderers
│   └── language/            ← isBCP47LanguageCode + CLDR data
└── config/                  ← typed input shape

packages/fs/src/module.ts            ← second IStore adapter (FSStore, persists set() as JSON)
packages/vue/src/index.ts            ← framework integration (Vue plugin)
packages/vuelidate/src/store/memory.ts ← preloaded MemoryStore (createMemoryStore) for validator names
packages/vuelidate/src/store/loader.ts ← lazy per-locale LoaderStore (createLoaderStore)
```

## Configuration

There are no environment variables. All configuration is passed via constructor inputs:

| Object                    | Shape                                                                                                                                |
|---------------------------|--------------------------------------------------------------------------------------------------------------------------------------|
| `new Ilingo(input)`       | `IlingoOptions` — `{ store?: IStore \| IStore[], locale?: string, fallback?: Fallback, onMissingKey?: MissingKeyHandler, formatters?: Record<string, Formatter> }` |
| `new MemoryStore(opts)`   | `MemoryStoreOptions` — `{ data: CatalogInput }`: the descriptor tree (`defineCatalog(...)` / `LocaleNode[]` / a single `LocaleNode`); normalized to `Locales` in the constructor |
| `new FSStore(input)`      | `FSStoreOptionsInput` — `{ directory?: string \| string[], writeDirectory?: string, watch?: boolean, id?: string \| symbol }`        |
| Vue `install(app, input)` | `Options { store, locale } \| Ilingo \| undefined`                                                                                  |

`Fallback = string | string[] | (locale) => string[] | false`. Explicit-empty forms (`[]`, `false`, or a resolver returning `[]`) opt out of fallback entirely — the chain is just `[locale]` with no default-locale tail.
