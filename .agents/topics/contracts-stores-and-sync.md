# Stores And Sync

## Synchronous read path (`getSync`)

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

`MemoryStore` keeps the map lookup in a protected `resolve()` that both `get` and `getSync` delegate to (same shape as confinity's `Store.resolve`). `get` must **not** route through the overridable `getSync`: adapters may need an asynchronous load before a cached lookup is available.

**`onMissingKey` fires on both paths.** Required by the equivalence guarantee — a handler-substituted string has to be identical for the seed and the async pass. Consequence: a seeding consumer reaches the handler twice per missing key. The built-in default is unaffected (`warnedKeys` is shared, so one warning total); a consumer handler with side effects must dedupe itself, which the missing-key guide documents.

`@ilingo/vue` consumes it through one helper (`composables/utils.ts` → `resolveSync`). It never throws: a `SyncUnavailableError` is expected control flow (nothing to seed), and any *other* error is swallowed too — the lookup runs on the synchronous setup path where an escaping throw aborts the mount — but reported once in dev, because the async pass hands the same error to VueUse's `onError` → `globalThis.reportError`, which is absent under Node SSR and would otherwise lose it exactly where it matters. All four async translation surfaces seed from it: `useTranslation`, `<ITranslateT>`, `useScopedCatalog().t`, and `<ITranslate>` (via `useTranslation`). The `v-t` directive is unchanged — Vue SSR does not execute directives without `getSSRProps`, and there is no `getSSRProps` shape for text content.

#### Seeding the validation-message layers

`@ilingo/validup` mirrors its three async helpers with `translateIssueSync` / `translateIssuesSync` / `translateIssueGroupsSync`, and `@ilingo/validup-vue` + `@ilingo/vuelidate` use them (resp. `instance.getSync?.()`) to seed their own `computedAsync`s.

These layers are the reason the core separates the two failure modes instead of collapsing them into one `undefined`. A code with no catalog entry must fall back to `issue.message` (exactly what the async path does), while a store that merely needs I/O must **not** — the async pass is about to produce a real translation, and falling back now would be a message that changes under the user, i.e. the very SSR mismatch class being fixed.

With a definite miss reported as `undefined` and unavailability thrown, `translateIssueSync` applies the async path's own fallback for the first case and returns `undefined` only for the second. An unexpected error (a broken store or formatter) is **re-thrown**, not masked as "unavailable". The batch helpers stay **all-or-nothing** — a batch where some messages are real and others placeholders that flip a tick later is harder to reason about, and a mismatch risk across an SSR boundary — but that now triggers rarely, since the only cause is a store needing I/O, which applies to every issue in the batch equally. `@ilingo/vuelidate`'s `useTranslationsForBaseValidation` applies the same rule per rule-name record (`value || rule`, matching its async body).


## Errors build on `@ebec/core`'s `BaseError`

`IlingoError extends BaseError`, the same base `LocterError` (locter) and `ValidupError` (validup) use, so an ilingo error carries a `code` (derived from the class name — `SyncUnavailableError` → `SYNC_UNAVAILABLE_ERROR`), a `cause`, and a `toJSON()`, and answers `@ebec/core`'s `isBaseError()` alongside the rest of the family. `SyncUnavailableError` overrides `toJSON()` to add its own `locale` / `namespace` / `key` / `storeId` (the last stringified, since a store `id` is usually a symbol).

The marker protocol is `@ebec/core`'s: each class declares a `Symbol.for(...)` marker and calls `markInstanceof(this, MARKER)`, so an instance accumulates its ancestors' markers on one non-enumerable `@instanceof` chain and a parent-class guard matches a subclass instance. This **replaced** ilingo's hand-rolled flat-symbol-property marker. Two things it buys beyond the dedup: `BaseError.toJSON()` re-emits the chain as strings, so identity survives a JSON round-trip (symbols don't serialise), and the whole family now shares one protocol.

The guards — `isIlingoError` / `isSyncUnavailableError` — live together in `errors/check.ts` (mirroring `@ebec/core`'s own `helpers/check.ts`), each a one-line `matchesInstanceof(input, MARKER)`, and each class's `[Symbol.hasInstance]` override delegates to its guard so `instanceof` and the guard can never disagree. The markers sit in `errors/constants.ts` rather than beside their classes: `check.ts` needs them and the classes need `check.ts` back for `[Symbol.hasInstance]`, so keeping them in a leaf module is what stops that from being a runtime import cycle. This matches `isBaseError` / `isValidupError` in the sibling packages. Prefer the guard: it matches every subclass through the shared chain and recognises an error rehydrated from `toJSON()`, which no `instanceof` can.

Markers use the family's `<pkg>/<ClassName>` key convention — `Symbol.for('ilingo/IlingoError')`, `Symbol.for('ilingo/SyncUnavailableError')`, alongside `@ebec/core/BaseError` and `validup/ValidupError` — exported as `ILINGO_ERROR_INSTANCE` / `SYNC_UNAVAILABLE_ERROR_INSTANCE`.

Error-family guards recognize `@instanceof` marker chains from `@ebec/core`; flat legacy symbol properties are not supported. Import generic marker helpers from `@ebec/core`.

The error family uses `@ebec/core`; preserve error-free tree-shaking paths and the bundle budgets declared in repository configuration.


## Cache invalidation

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
