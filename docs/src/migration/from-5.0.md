# Upgrading from 5.0

This page lists every change since `ilingo@5.0.0` / `@ilingo/fs@5.0.0` / `@ilingo/vue@5.0.0` / `@ilingo/vuelidate@6.0.0` that requires action on your side. New additive features (LoaderStore, formatters, Vue ergonomics, locale negotiation, …) are documented in the matching guide pages and are not repeated here.

If you do not author plural leaves, do not implement a custom `IStore`, and do not call `store.set(...)` directly, your code runs unchanged — skim and move on.

## `ilingo` (core)

### Plural leaves must use the `@plural` wrapper

The bare structural form (a `{ one, other }` object recognised by shape) is gone. Authoring now requires the explicit `@plural` marker.

**Before:**

```typescript
const catalog = {
    en: {
        cart: {
            items: { one: '1 item', other: '{{count}} items' },
        },
    },
};
```

**After (JSON):**

```json
{
    "cart": {
        "items": {
            "@plural": {
                "one": "1 item",
                "other": "{{count}} items"
            }
        }
    }
}
```

**After (TS):**

```typescript
import { defineCatalog, definePlural } from 'ilingo';

const catalog = defineCatalog({
    en: {
        cart: {
            items: definePlural({
                one:   '1 item',
                other: '{{count}} items',
            }),
        },
    },
});
```

Why: the structural form collided with sibling keys named after CLDR categories (e.g. an enum dropdown with an "other" option). The explicit marker eliminates the ambiguity. See [Catalog Design](../guide/catalog-design#authoring-plurals-json-vs-tsjs) for the authoring story.

A bare `{ one, other }` object still type-checks as a regular nested namespace; it just no longer triggers plural selection at lookup. Typed catalogs (`Ilingo<typeof catalog>`) catch the gotcha at compile time — `ilingo.get({ group: 'cart', key: 'items' })` becomes a type error because `items` is no longer a leaf.

### Plural type names: `PluralLeaf` is now the wrapper

The plural-related types and guards renamed in lock-step with the `@plural` change.

| Old name | New name | What it is |
|---|---|---|
| `PluralLeaf` | `PluralForms` | inner CLDR options `{ other, zero?, one?, ... }` |
| `PluralLeafExplicit` | `PluralLeaf` | wrapper `{ '@plural': PluralForms }` (catalog leaf) |
| `isPluralLeaf` | `isPluralForms` | inner-shape guard |
| `isPluralLeafExplicit` | `isPluralLeaf` | wrapper guard |
| `asPluralLeaf` | _(removed)_ | inline `if (isPluralLeaf(v)) return v['@plural']` |

**Before:**

```typescript
import type { PluralLeaf, PluralLeafExplicit } from 'ilingo';
import { isPluralLeaf, asPluralLeaf } from 'ilingo';

function handle(value: unknown) {
    const forms = asPluralLeaf(value);  // accepted either form
    if (forms) /* ... */;
}
```

**After:**

```typescript
import type { PluralForms, PluralLeaf } from 'ilingo';
import { isPluralLeaf } from 'ilingo';

function handle(value: unknown) {
    if (isPluralLeaf(value)) {
        const forms: PluralForms = value['@plural'];
        /* ... */
    }
}
```

### Stores are now walked serially within a locale

`Ilingo.lookup` previously issued `Promise.all` across every store in a locale and picked the first declared hit. It now walks stores serially in insertion order and stops at the first hit.

**Observable change:** custom stores after a hit are not called at all. A network-backed adapter registered after a `MemoryStore` is never queried when the Memory store has the key.

**Action required:** only if you have a custom store with side effects (metrics, warm-up, request counting) that depended on being invoked on every key. Move that work behind the store's own logic — inside `get()` — so it fires when the store is actually consulted.

When every registered store would have hit, total latency is now `sum(per-store)` instead of `max(per-store)`. In practice the in-tree adapters are sync after first warm-up, so the worst case rarely fires. See [Stores: Multiple stores](../guide/stores#multiple-stores) for the new contract.

### `StoreSetContext.value` is narrower

`value` you pass to `store.set(...)` must now be `string | PluralLeaf` (the wrapper). Passing the bare `{ one, other }` shape used to silently round-trip (because the structural form was recognised on read) — it no longer does.

**Before:**

```typescript
await store.set({
    locale: 'en', group: 'cart', key: 'items',
    value: { one: '1 item', other: '{{count}} items' },
});
```

**After:**

```typescript
await store.set({
    locale: 'en', group: 'cart', key: 'items',
    value: { '@plural': { one: '1 item', other: '{{count}} items' } },
});
```

## `@ilingo/fs`

### `FSStore.get` return type widened to `Leaf`

`FSStore.get` was declared `Promise<string | undefined>` while inheriting from `MemoryStore.get` which returns `Promise<Leaf | undefined>`. The override illegally narrowed the return type. It is now `Promise<Leaf | undefined>`, matching the parent.

**Action required:** only if you type-checked the result of `FSStore.get` directly and expected the narrower type. Switch to `Leaf` and discriminate with `typeof v === 'string'`.

## `@ilingo/vue` and `@ilingo/vuelidate`

No breaking changes.

## Quick-check: am I affected?

| Change | Affected if you... |
|---|---|
| `@plural` wrapper required | author plural leaves anywhere (JSON or TS) |
| `PluralLeaf` rename | import any of the renamed types or guards |
| Serial store walk | run a custom store with side effects |
| `StoreSetContext.value` narrower | call `store.set(...)` with a plural value directly |
| `FSStore.get` widening | type-check `FSStore.get` results against `string` |

If none of the above apply, your code runs unchanged.
