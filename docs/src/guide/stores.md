# Stores

A **store** is anything that can return a translation leaf for a given `(locale, namespace, key)`. ilingo is **read-first** — its job is to *read* a datasource — so the `IStore` port is the read contract: `id`, `get`, `getLocales`.

```typescript
import type { Leaf, PluralLeaf } from 'ilingo';

export type StoreGetContext = { locale: string, namespace: string, key: string };
export type StoreSetContext = StoreGetContext & { value: string | PluralLeaf };

export interface IStore {
    readonly id: string | symbol;
    get(context: StoreGetContext): Promise<Leaf | undefined>;
    getLocales(): Promise<string[]>;
}
```

The orchestrator only ever calls `get` (and `getLocales`) — it never writes. So a read-only adapter (a remote/HTTP datasource) implements just these. **Writing is an opt-in capability**, `IMutableStore`:

```typescript
import type { IStore, StoreSetContext } from 'ilingo';

export interface IMutableStore extends IStore {
    set(context: StoreSetContext): Promise<void>;
}

export function isMutableStore(store: IStore): store is IMutableStore; // type guard
```

`MemoryStore` (in-memory mutation) and `FSStore` (writes through to disk) implement it; `extendStore(...)` takes a `IMutableStore`. All methods are async — keep that contract even when the implementation is synchronous, because `Ilingo.lookup` awaits every store call.

::: tip Frozen surface
The `IStore` **read** port is **frozen** at `id` / `get` / `getLocales` for the stable release. Capabilities beyond reading layer as separate interfaces detected via type guards — `IMutableStore` (writing) and `IInvalidatingStore` (caching, below) are the pattern. `has`, `delete`, `getKeys`, and batch `getAll` were considered and deferred (see the source JSDoc for the rationale per method); they would follow the same opt-in-interface pattern if added later.
:::

## MemoryStore

The default. Holds translations in a plain nested object:

```typescript
import { Ilingo, MemoryStore } from 'ilingo';

const store = new MemoryStore({
    data: {
        en: { app: { hi: 'Hello, {{name}}!' } },
        de: { app: { hi: 'Hallo, {{name}}!' } },
    },
});

const ilingo = new Ilingo({ store });
```

You can also write at runtime — useful when translations come from an API. `set()` satisfies the async `IMutableStore` port, but `MemoryStore` is in-memory, so it *also* exposes a synchronous **`setSync()`** for seeding data after construction without an `await`:

```typescript
// synchronous — no await needed (MemoryStore-specific)
store.setSync({ locale: 'es', namespace: 'app', key: 'hi', value: '¡Hola, {{name}}!' });

// the async port method — same effect; delegates to setSync()
await store.set({ locale: 'es', namespace: 'app', key: 'hi', value: '¡Hola, {{name}}!' });
```

`setSync` (and the matching `getSync` / `getLocalesSync`) are concrete `MemoryStore` methods, **not** part of the async `IStore` / `IMutableStore` port — an async-only backend (`LoaderStore`, a remote datasource) can't answer synchronously, so the port stays async and only stores that genuinely hold data in memory offer the sync variants.

## LoaderStore

For browser / SPA apps that code-split locales, `LoaderStore` lazy-loads translation data via a user-supplied function and caches the result per `(locale, namespace)`:

```typescript
import { Ilingo, LoaderStore } from 'ilingo';

const ilingo = new Ilingo({
    store: new LoaderStore({
        loader: async (locale, namespace) => {
            const m = await import(`./locales/${locale}/${namespace}.json`);
            return m.default;
        },
        locales: ['en', 'de', 'fr'],
    }),
});
```

- Concurrent `get()`s for the same `(locale, namespace)` share one loader call.
- Misses (loader returning `undefined`) are cached too — the loader isn't re-called for known-missing pairs.
- Implements `IInvalidatingStore` — see [Cache invalidation](#cache-invalidation).

## Cache invalidation

Stores that cache lookups can implement `IInvalidatingStore`:

```typescript
export interface IInvalidatingStore extends IStore {
    invalidate(locale?: string, namespace?: string): void;
    on(event: 'invalidate', listener: (locale?: string, namespace?: string) => void): () => void;
}
```

Both `LoaderStore` and `FSStore` implement it. `@ilingo/vue`'s `useTranslation` automatically subscribes to every `IInvalidatingStore` in the instance's store set — so file changes under `FSStore({ watch: true })` show up in the rendered UI without a remount.

```typescript
import { isInvalidatingStore } from 'ilingo';

for (const store of ilingo.stores.values()) {
    if (isInvalidatingStore(store)) {
        store.on('invalidate', (locale, namespace) => {
            console.log(`reloaded ${locale ?? '*'}/${namespace ?? '*'}`);
        });
    }
}
```

## FSStore

Lazy-loads files from disk. See [Integrations → File System](/integrations/fs) for the full story; the gist:

```typescript
import { Ilingo } from 'ilingo';
import { FSStore } from '@ilingo/fs';

const ilingo = new Ilingo({
    store: new FSStore({ directory: './locales' }),
});

// reads ./locales/en/app.json (or .ts / .mjs / .cjs / .conf) on first access
await ilingo.get({ namespace: 'app', key: 'hi' });
```

## Multiple stores

An `Ilingo` instance exposes `public readonly stores: Map<symbol | string, IStore>` — **each store's own `id` is its key**, and the Map's insertion order is the query order. Register as many as you want via `registerStore(store)`; they are queried **serially in insertion order** within each locale, stopping at the first hit:

```typescript
const ilingo = new Ilingo({
    store: new MemoryStore({ data: { /* core strings */ } }),
});

// add more after construction — checked only when the earlier store misses
ilingo.registerStore(new FSStore({ directory: './locales/overrides' }));
```

`registerStore(store)` keys the store by its own `id` (`string | symbol`):

- **Anonymous `id`** (a fresh `Symbol()`, the `MemoryStore` default) — always added, since each `Symbol()` is unique.
- **Stable `id`** (`Symbol.for('@scope/pkg')` set on the store) — idempotent. If a store with that `id` is already registered, the call is a no-op and the existing store is kept, so registering twice (or across a duplicate package copy) never stacks duplicates.

The constructor's `store` option is just `registerStore(store)` under the hood. The serial walk is the reason "local first, remote fallback" compositions work as written: a network-backed store registered after a Memory store is only consulted when the Memory store has nothing for `(locale, namespace, key)` — the orchestrator does not pre-fan-out across stores. Locale-first composition still applies: a closer locale always beats a farther one regardless of which store would have answered.

## Composing many sources — `namespace` is a shared key-space

A real app pulls translations from several sources: the app's own catalog, plus library catalogs like `@ilingo/validup` (validation messages) or [`@ilingo/vuelidate`](/integrations/vuelidate). The model is **one instance, many stores, `namespace` as a shared key-space**:

- Each source is its own store on the **same** `Ilingo` instance — so all sources share one set of formatters, one fallback chain, one missing-key handler.
- A `namespace` (`app`, `email`, `validup`, …) is **not owned by a single store**. `MemoryStore.get()` returns `undefined` per *missing key*, so the orchestrator falls through store-by-store *within the same namespace*. That means an app can co-own a library's namespace — add its own keys, override individual ones — just by registering its own store **first**.

```typescript
import { Ilingo } from 'ilingo';
import { FSStore } from '@ilingo/fs';
import { createMemoryStore } from '@ilingo/validup/store/memory';

const ilingo = new Ilingo({ fallback: ['en'] });

// app catalog FIRST → its keys win per (locale, namespace, key)
ilingo.registerStore(new FSStore({ directory: './locales' }));

// library catalog appended → fills the built-in defaults the app store misses
ilingo.registerStore(createMemoryStore());
```

Now a lookup for `(en, validup, value_invalid)` falls through the app store (no such key) to the validup catalog, while `(en, validup, my_custom_code)` — a code the app defined under the `validup` namespace, e.g. via a `./locales/en/validup.json` file (`FSStore` derives the namespace from the filename) — is answered by the app store. Overriding a single built-in message works the same way: define `(en, validup, value_invalid)` in the app store and it wins, with every other code still served by the library.

## Merging instances

`merge(other)` folds another instance's stores in, deduping **by symbol identity**: a foreign store whose key is already present is skipped (the existing one wins); foreign keys not present are appended in order. Library catalogs keyed by `Symbol.for('@scope/pkg')` never stack across a merge; anonymously-keyed stores are always distinct and so always carried over.

```typescript
const base = new Ilingo({ store: storeA });
const themed = new Ilingo({ store: storeB });

base.merge(themed); // base now queries storeA then storeB
```

## Writing a custom store

Implement the interface as a class — not an object literal — so signature drift is caught at compile time. Because the `IStore` port is read-only, a remote datasource implements just `id` / `get` / `getLocales` — **no `set` stub**:

```typescript
import type { IStore, StoreGetContext, Leaf } from 'ilingo';

export class HttpStore implements IStore {
    readonly id = Symbol.for('app/http-store');

    async get(ctx: StoreGetContext): Promise<Leaf | undefined> {
        const res = await fetch(`/i18n/${ctx.locale}/${ctx.namespace}.json`);
        if (!res.ok) return undefined;
        const data = await res.json();
        return data[ctx.key];
    }

    async getLocales(): Promise<string[]> {
        return ['en', 'de'];
    }
}
```

If your store *is* writable, implement `IMutableStore` instead (add `set(ctx: StoreSetContext)`); `isMutableStore(store)` lets callers detect it.

Rules of thumb:

- Give every store a stable `id` (use `Symbol.for('@scope/name')` for a library catalog so it dedupes across duplicate copies); `Ilingo.registerStore` keys the store map by it.
- Return `undefined` on miss. **Never throw.** Throwing breaks the fallback walk.
- Returning `PluralForms` (the unwrapped CLDR-categorised options) is allowed but optional. String-only stores are valid. Custom stores that hold raw `PluralLeaf` (`{ "@plural": ... }`) values should unwrap before returning, matching `MemoryStore` and `LoaderStore`.
- If you need a load cache, extending `MemoryStore` and using the parent map is idiomatic (`FSStore` does this).
