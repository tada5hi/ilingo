# Architecture

## Overview

ilingo follows a small **port-and-adapter** design:

- **Port**: `IStore` (`packages/ilingo/src/store/types.ts`) defines `get`, `set`, `getLocales`.
- **Adapters**: `MemoryStore` (default, in-memory) and `FSStore` (lazy-loads files from disk) implement the port.
- **Orchestrator**: `Ilingo` (`packages/ilingo/src/module.ts`) holds a `Set<IStore>`, iterates through stores on each `get()` until one returns a hit, then applies the `{{var}}` template formatter.

Higher-layer packages (`@ilingo/vue`, `@ilingo/vuelidate`) wrap the orchestrator for a specific framework — Vue's `provide`/`inject` makes the `Ilingo` instance and locale `Ref` available to descendants of the app root.

## Core Design Decisions

### 1. Multi-store, first-hit lookup

`Ilingo` holds a **set** of stores, not just one. On `get()` it walks them in insertion order and returns the first non-`undefined` message. This lets consumers layer stores — e.g. an `FSStore` for default translations plus an in-memory `MemoryStore` for runtime overrides. `merge(otherIlingo)` is the only supported way to combine two instances; it adds foreign stores that are not already present (identity check, not deep equality).

### 2. Group/key model

Translations are addressed by `(locale, group, key)`. The `group` is a logical namespace — typically a filename when using `FSStore` (`packages/fs/src/module.ts` resolves `<directory>/<locale>/<group>.{js,mjs,cjs,ts,mts,json,conf}`). The `key` is a `pathtrace`-style dotted path within that group's nested object (see `MemoryStore.get` using `getPathValue`).

### 3. ESM-first, dependency-light

Each package's runtime dependencies are minimal — `pathtrace` and `smob` in core; `locter`, `pathe`, `smob` in `@ilingo/fs`. Vue and Vuelidate are declared as `peerDependencies`, not bundled. Builds produce a single `.mjs` per package (no CJS output is shipped today — the `require` conditions in subpath exports reference non-existent `.js` files; treat that as a known wart, not a contract).

## Design Patterns

### Store Pattern (port + adapter)

Port — `packages/ilingo/src/store/types.ts`:

```typescript
export type StoreGetContext = {
    locale: string,
    group: string,
    key: string,
};

export type StoreSetContext = StoreGetContext & { value: string };

export interface IStore {
    get(context: StoreGetContext): Promise<string | undefined>;
    set(context: StoreSetContext): Promise<void>;
    getLocales(): Promise<string[]>;
}
```

Adapter — `packages/ilingo/src/store/memory.ts`:

```typescript
export class MemoryStore implements IStore {
    protected data: LocalesRecord;

    constructor(options: MemoryStoreOptions) { this.data = options.data; }

    async get(ctx: StoreGetContext): Promise<string | undefined> {
        if (!this.data[ctx.locale] || !this.data[ctx.locale][ctx.group]) return undefined;
        const out = getPathValue(this.data[ctx.locale][ctx.group], ctx.key);
        return typeof out === 'string' ? out : undefined;
    }
    // set(...), getLocales()
}
```

Conventions:

- New stores **implement `IStore`** rather than extending `MemoryStore` unless they want the in-memory cache (`FSStore` does extend it, using the parent map as a load cache).
- All methods are async, even when synchronous — keep that contract; `Ilingo.get` `await`s every store call.
- A miss is `undefined`. Do not throw on miss; throwing breaks the multi-store fallback loop.

### Orchestrator Pattern (`Ilingo`)

```typescript
async get(ctx: GetContext): Promise<string | undefined> {
    let message: string | undefined;
    for (const store of this.stores) {
        message = await store.get({
            locale: ctx.locale || this.getLocale(),
            group: ctx.group,
            key: ctx.key,
        });
        if (message) break;
    }
    if (!message) return undefined;
    return this.format(message, ctx.data || {});
}
```

`Ilingo` itself owns three things only: the locale (default `'en'` from `LOCALE_DEFAULT`), the ordered store set, and template formatting. Anything more specific — file I/O, validator messages, Vue reactivity — lives in a higher-layer package.

### Vue Plugin Pattern

`@ilingo/vue` exposes `install(app, input)` and a default `Plugin` object. `applyInstallInput` is the heart of it — it is idempotent and merge-aware:

1. Read any already-`provide`d `Ilingo` instance and locale `Ref` from the app.
2. Resolve the new `input`: nothing → fresh `Ilingo`; an `Ilingo` → merge into existing or use directly; an `Options { store, locale }` → add the store to the existing instance or create one.
3. Provide the instance and locale only if they were not provided before — so calling `install` more than once does not clobber existing wiring.

`@ilingo/vuelidate` chains this: it calls `applyInstallInput`, then ensures its own `Store` (a `MemoryStore` pre-loaded with EN/DE/FR/ES validator translations) is registered if none is present yet.

## Data Flow

```
Input:
  └── ctx: { group, key, locale?, data? }   (caller — code, <ITranslate>, or useTranslation())

Processing:
  1. Ilingo.get() resolves the effective locale (ctx.locale ?? this.locale)
  2. Iterates this.stores in insertion order
       └── each store.get({ locale, group, key }) returns string | undefined
  3. First non-undefined wins
  4. template(message, data) — substitutes {{var}} placeholders from ctx.data

Output:
  └── Promise<string | undefined>           ('undefined' = no store had the key)
```

## Error Handling

- Misses return `undefined`. They are never errors.
- `FSStore.loadGroup` swallows the "already loaded" case (`isLoaded` short-circuit, marked `/* istanbul ignore next */`) — repeat lookups for the same group are cheap.
- File-loading errors from `locter`/`load` propagate. There is no project-wide error wrapper; rely on the underlying error type.
- `template()` (`packages/ilingo/src/utils/template.ts`) does **not** error on a missing data key — the `{{var}}` stays in the output. Vue's `useTranslation` falls back to `"${group}.${key}"` when `Ilingo.get` returns `undefined`.

## File Structure (architectural layers)

```text
packages/ilingo/src/
├── module.ts            ← orchestrator
├── store/{types,memory} ← port + default adapter
├── utils/               ← stateless helpers (template, identify, language)
└── config/              ← typed input shape

packages/fs/src/module.ts          ← second IStore adapter (FSStore)
packages/vue/src/index.ts          ← framework integration (Vue plugin)
packages/vuelidate/src/store.ts    ← preloaded MemoryStore for validator names
```

## Configuration

There are no environment variables. All configuration is passed via constructor inputs:

| Object                    | Shape                                                    |
|---------------------------|----------------------------------------------------------|
| `new Ilingo(input)`       | `{ store?: IStore, locale?: string }`                    |
| `new MemoryStore(opts)`   | `{ data: LocalesRecord }`                                |
| `new FSStore(input)`      | `{ directory?: string \| string[] }` (normalized to `string[]`) |
| Vue `install(app, input)` | `Options { store, locale } \| Ilingo \| undefined`       |
