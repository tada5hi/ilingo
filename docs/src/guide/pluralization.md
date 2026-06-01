# Pluralization

Leaves can be **plural objects** keyed by CLDR category (`zero | one | two | few | many | other`). `Ilingo` selects the matching form via `Intl.PluralRules` keyed by the *resolved* locale.

## TS/JS: `definePlural`

Author plurals with the `definePlural` helper. Its argument type is `PluralForms`, so you get autocomplete for the CLDR categories and a compile error on a missing `other` / non-CLDR key:

```typescript
import { defineNamespace, defineTranslations, definePlural } from 'ilingo';

defineNamespace('cart', [
    defineTranslations({
        items: definePlural({
            one: '{{count}} item',
            other: '{{count}} items',
        }),
    }),
]);
```

`definePlural` returns a plural node (`{ type: 'plural', data: forms }`). A plain `{ one, other }` object passed to `defineTranslations` is **not** a plural — it's a key-nested map, so siblings called `one`, `other`, etc. are reachable via dotted access. Only a node produced by `definePlural` (or the literal `{ "type": "plural", ... }` form in JSON) is interpreted as a plural.

## JSON

JSON cannot call functions, so a plural is spelled as a literal plural node inside the file's translations node:

```json
{
    "type": "translations",
    "data": {
        "items": {
            "type": "plural",
            "data": { "one": "{{count}} item", "other": "{{count}} items" }
        }
    }
}
```

Both forms produce identical runtime data — `Intl.PluralRules` doesn't care which authoring path produced the leaf.

## Selection rules

```typescript
await ilingo.get({ namespace: 'cart', key: 'items', count: 0 }); // 'other' (en has no 'zero')
await ilingo.get({ namespace: 'cart', key: 'items', count: 1 }); // 'one'
await ilingo.get({ namespace: 'cart', key: 'items', count: 5 }); // 'other'
```

- If the selected category is **absent**, `other` is used.
- The locale used by `Intl.PluralRules` is the **resolved** locale (the one that actually yielded the leaf), not the requested one. Useful when `en-US → en` falls back and you want the English plural rules to apply.

## Caching

`Intl.PluralRules` instances are cached **per locale** on the `Ilingo` instance. Repeated calls do not reallocate.

## Round-tripping

Plural leaves go through `store.set()` cleanly — `StoreSetContext.value` accepts a `string` or a plural **node** (`definePlural(...)` / `{ type: 'plural', data }`), not the unwrapped `PluralForms`, so the store recognises and unwraps it on read. `FSStore.set` persists it as JSON unchanged.
