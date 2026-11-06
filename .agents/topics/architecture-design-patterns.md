# Design Patterns

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

### `@ilingo/validup` — the issue model lives in `@ebec/core`

`Issue`, `IssueGroup`, `IssueItem`, `IssueCode`, the `defineIssue*` factories, the `isIssue*` guards and `flattenIssue*` are owned and versioned by [`@ebec/core`](https://github.com/tada5hi/ebec), **not** by `validup`. Up to validup 1.x they were re-exported from `validup`, so ilingo imported them from there; validup 2.0.0 stopped re-exporting and both validup packages now import them from `@ebec/core` directly. The relocation was purely a move — the type shapes, all 23 `IssueCode` values and the helper signatures are unchanged (`flattenIssueItems` only widened its parameter to `readonly Issue[]`).

`@ebec/core` is a plain **`dependency`** of `@ilingo/validup` and `@ilingo/validup-vue`, not a peer — matching how `validup` and `@validup/vue` declare it themselves, so a consumer never has to install it to make the packages work. It is safe as a non-peer because nothing here depends on instance identity: issues are plain data compared structurally, `IssueCode`s are strings, and `flattenIssueItems` is pure. A duplicate copy in the tree costs a few bytes and changes no behaviour — unlike `ilingo` and `validup`, which stay peers because the consumer constructs and hands in those very objects.

`validup` itself remains a peer and still owns everything else the packages touch (`Container`, `ValidupError`, `ObjectLiteral`, `Validator`).

### `@ilingo/validup-vue` — composables are `setup()`-only; `<IFieldValidation>` for templates

Every reactive composable in `@ilingo/validup-vue` ultimately wires a VueUse `computedAsync`, which registers a `watchEffect` in the **active effect scope at call time**. The contract is therefore: **call these composables from `setup()`**, where the active scope is the component scope — the watcher is created once and disposed on unmount. The `<IValidup>` / `<IValidupT>` components and all the `useTranslations*` composables already follow this.

The trap (#965) is calling a composable from the **render** function. Empirically (Vue 3.5, verified by probe) the active effect scope during render is **`undefined`**, so a render-created `computedAsync` watcher belongs to no scope and Vue **never disposes it** — not between renders (it accumulates → unbounded self-amplifying list that hangs the page on the second keystroke) and **not on unmount** (each leaked watcher stays subscribed to the long-lived injected locale ref forever). `useFieldValidation` was the one composable *documented* to be used inline in the template (`:validation="useFieldValidation(...)"`), which is exactly this trap.

The fix moves the lifecycle into a **renderless component** rather than papering over the render-time call:

- `useFieldValidation` (`use-field-validation.ts`) is now a plain `setup()`-time composable — no cache, no scope plumbing. Used from `setup()` it is leak-free by construction.
- `<IFieldValidation>` (`component-field-validation.ts`) is the template-only path. It calls `useFieldValidation(toRef(props, 'field'))` in its **own** `setup()`, so the watcher lives in that component's scope — created once, disposed on the component's unmount. The default scoped slot exposes the bundle as `value` (`<IFieldValidation :field v-slot="{ value }">`). Each `<IFieldValidation>` instance is its own component, so two of them over the same `FieldState` never share a watcher. This mirrors the existing `<IValidup>` / `<IValidupT>` renderless pattern — the package's established answer to "translation needs a lifecycle."

A per-`(component, field)` memoization cache (keyed by `getCurrentInstance()`, watcher in an `effectScope` torn down via `onUnmounted`) was prototyped and rejected: it works, but it relies on render-time `getCurrentInstance()` (undocumented) and a module-level `WeakMap`, where the renderless component achieves the same lifetime guarantees with only public, idiomatic Vue. A *module-global* cache keyed only by `FieldState` was rejected outright — the single surviving watcher outlives its creating component and is shared across components, re-introducing both the unmount leak and cross-component staleness.

