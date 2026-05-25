# Stores

A **store** is anything that can return a translation leaf for a given `(locale, group, key)`. The `IStore` port has three methods:

```typescript
import type { Leaf } from 'ilingo';

export type StoreGetContext = { locale: string, group: string, key: string };
export type StoreSetContext = StoreGetContext & { value: Leaf };

export interface IStore {
    get(context: StoreGetContext): Promise<Leaf | undefined>;
    set(context: StoreSetContext): Promise<void>;
    getLocales(): Promise<string[]>;
}
```

All methods are async — keep that contract even when the implementation is synchronous, because `Ilingo.lookup` awaits every store call.

::: tip Frozen surface
The `IStore` port is **frozen** at these three methods for the stable release. Optional capabilities (caching, invalidation, watching) layer as separate interfaces detected via type guards — `InvalidatingStore` below is the pattern. `has`, `delete`, `getKeys`, and batch `getAll` were considered and deferred (see the source JSDoc for the rationale per method); they will follow the same opt-in-interface pattern if added later.
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

You can also `set()` at runtime — useful when translations come from an API:

```typescript
await store.set({
    locale: 'es',
    group: 'app',
    key: 'hi',
    value: '¡Hola, {{name}}!',
});
```

## LoaderStore

For browser / SPA apps that code-split locales, `LoaderStore` lazy-loads translation data via a user-supplied function and caches the result per `(locale, group)`:

```typescript
import { Ilingo, LoaderStore } from 'ilingo';

const ilingo = new Ilingo({
    store: new LoaderStore({
        loader: async (locale, group) => {
            const m = await import(`./locales/${locale}/${group}.json`);
            return m.default;
        },
        locales: ['en', 'de', 'fr'],
    }),
});
```

- Concurrent `get()`s for the same `(locale, group)` share one loader call.
- Misses (loader returning `undefined`) are cached too — the loader isn't re-called for known-missing pairs.
- Implements `InvalidatingStore` — see [Cache invalidation](#cache-invalidation).

## Cache invalidation

Stores that cache lookups can implement `InvalidatingStore`:

```typescript
export interface InvalidatingStore extends IStore {
    invalidate(locale?: string, group?: string): void;
    on(event: 'invalidate', listener: (locale?: string, group?: string) => void): () => void;
}
```

Both `LoaderStore` and `FSStore` implement it. `@ilingo/vue`'s `useTranslation` automatically subscribes to every `InvalidatingStore` in the instance's store set — so file changes under `FSStore({ watch: true })` show up in the rendered UI without a remount.

```typescript
import { isInvalidatingStore } from 'ilingo';

for (const store of ilingo.stores) {
    if (isInvalidatingStore(store)) {
        store.on('invalidate', (locale, group) => {
            console.log(`reloaded ${locale ?? '*'}/${group ?? '*'}`);
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
await ilingo.get({ group: 'app', key: 'hi' });
```

## Multiple stores

An `Ilingo` instance exposes a `public readonly stores: Set<IStore>` — add as many as you want. They are queried **serially in insertion order** within each locale, stopping at the first hit:

```typescript
const ilingo = new Ilingo({
    store: new MemoryStore({ data: { /* core strings */ } }),
});

// add more after construction — checked only when the Memory store misses
ilingo.stores.add(new FSStore({ directory: './locales/overrides' }));
```

The constructor's `store` option seeds the first entry; everything else goes through `ilingo.stores.add(...)`. Set semantics make repeated adds of the same reference a no-op.

The serial walk is the reason "local first, remote fallback" compositions work as written. A network-backed store registered after a Memory store is only consulted when the Memory store has nothing for `(locale, group, key)` — the orchestrator does not pre-fan-out across stores. Locale-first composition still applies: a closer locale always beats a farther one regardless of which store would have answered.

## Merging instances

`merge(other)` adds the foreign instance's stores that are not already present. Identity-based — the same `MemoryStore` reference is never added twice:

```typescript
const base = new Ilingo({ store: storeA });
const themed = new Ilingo({ store: storeB });

base.merge(themed); // base now queries storeA then storeB
```

## Writing a custom store

Implement the interface as a class — not an object literal — so signature drift is caught at compile time:

```typescript
import type { IStore, StoreGetContext, StoreSetContext, Leaf } from 'ilingo';

export class HttpStore implements IStore {
    async get(ctx: StoreGetContext): Promise<Leaf | undefined> {
        const res = await fetch(`/i18n/${ctx.locale}/${ctx.group}.json`);
        if (!res.ok) return undefined;
        const data = await res.json();
        return data[ctx.key];
    }

    async set(_ctx: StoreSetContext): Promise<void> {
        throw new Error('read-only');
    }

    async getLocales(): Promise<string[]> {
        return ['en', 'de'];
    }
}
```

Rules of thumb:

- Return `undefined` on miss. **Never throw.** Throwing breaks the fallback walk.
- Returning `PluralForms` (the unwrapped CLDR-categorised options) is allowed but optional. String-only stores are valid. Custom stores that hold raw `PluralLeaf` (`{ "@plural": ... }`) values should unwrap before returning, matching `MemoryStore` and `LoaderStore`.
- If you need a load cache, extending `MemoryStore` and using the parent map is idiomatic (`FSStore` does this).
