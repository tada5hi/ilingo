# Type-Safe Keys

`Ilingo` is generic in the catalog shape. Pass a typed catalog and the compiler refuses typos, unknown groups, and plural-key calls that forget `count`.

## Setup

```typescript
import { Ilingo, MemoryStore, defineCatalog } from 'ilingo';

const catalog = defineCatalog({
    en: {
        app: {
            greeting: 'Hi {{name}}',
            nested: { deep: { leaf: 'Deep value' } },
        },
        cart: {
            items: {
                '@plural': {
                    one: '{{count}} item',
                    other: '{{count}} items',
                },
            },
        },
    },
    de: { /* …same shape… */ },
});

const ilingo = new Ilingo<typeof catalog>({
    store: new MemoryStore({ data: catalog }),
});
```

## Compile-time checks

```typescript
await ilingo.get({ group: 'app', key: 'greeting' });           // OK
await ilingo.get({ group: 'app', key: 'nested.deep.leaf' });   // OK — dotted paths inferred
await ilingo.get({ group: 'app', key: 'unknown' });            // ❌ type error
await ilingo.get({ group: 'unknown', key: 'greeting' });       // ❌ type error
await ilingo.get({ group: 'cart',  key: 'items' });            // ❌ type error — count is required
await ilingo.get({ group: 'cart',  key: 'items', count: 1 });  // OK
```

## How it works

`defineCatalog<const T>(c)` is a runtime no-op identity function. The const generic captures the catalog literal without widening its types — saves you from sprinkling `as const`. Under the hood, the type system computes:

- `Groups<C>` — union of top-level group names from any locale.
- `Key<C, G>` — union of dotted leaf paths within group `G`.
- `IsPluralKey<C, G, K>` — `true` if the leaf at `(G, K)` is a plural object. Makes `count` required at the type level.
- `GetParams<C, G, K>` — the shape of `data` required by `{{var}}` placeholders in the leaf.

## Opt out

`new Ilingo()` (no generic) preserves the loose typing — `group: string`, `key: string`. The generic is purely opt-in. You can also pass a partial catalog type and rely on `string` for unmodeled groups.

## Diverging locales

Inference is structural — derived from the **union** of all locales in the catalog. Keep locales aligned to the same shape and `Key<C, G>` is the natural set of leaf paths. Diverging locales (e.g. `de.cart.items` exists but `en.cart.items` doesn't) widen the union but never break compilation.

In practice: write your English catalog first, copy it for each new locale, then translate the values. The shape stays uniform automatically.

## The `IIlingo` interface

`IIlingo<C>` is the public type contract of the orchestrator — every method on the concrete `Ilingo` class plus the `stores` map and `formatters` registry. Library code that accepts or returns an orchestrator (`@ilingo/vue`'s `injectIlingo` / `provideIlingo` / `applyInstallInput`, `@ilingo/vuelidate`'s `register`, `@ilingo/validup`'s `translateIssue`) uses `IIlingo`, so consumers can swap in test doubles or decorating wrappers without depending on the concrete class.

```typescript
import type { IIlingo } from 'ilingo';

function register(ilingo: IIlingo) {
    ilingo.register(myStore, Symbol.for('@scope/pkg'));
}
```

`new Ilingo()` is still the way to construct an instance. Prefer `IIlingo` as the type position; reserve `Ilingo` (the class) for construction.
