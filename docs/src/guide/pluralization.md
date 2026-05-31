# Pluralization

Leaves can be **plural objects** keyed by CLDR category (`zero | one | two | few | many | other`). `Ilingo` selects the matching form via `Intl.PluralRules` keyed by the *resolved* locale.

## The `@plural` wrapper

Plural forms are recognised only when wrapped in `{ "@plural": { ... } }`:

```json
{
    "cart": {
        "items": {
            "@plural": {
                "one": "{{count}} item",
                "other": "{{count}} items"
            }
        }
    }
}
```

The marker disambiguates plurals from regular namespaces that happen to use CLDR-category keys. A bare `{ one, other }` object — without the marker — is treated as an ordinary nested namespace, so siblings called `one`, `other`, etc. are reachable via dotted access without being interpreted as plural categories.

## TS/JS: `definePlural`

JSON cannot call functions, but TS/JS can — use `definePlural` to get autocomplete and a compile error on missing-`other` / non-CLDR keys:

```typescript
import { defineCatalog, definePlural } from 'ilingo';

const catalog = defineCatalog({
    en: {
        cart: {
            items: definePlural({
                one: '{{count}} item',
                other: '{{count}} items',
            }),
        },
    },
});
```

Runtime: `definePlural` returns `{ '@plural': leaf }` — identical to the JSON form. Type system: the const generic preserves the literal types so `Ilingo<typeof catalog>` still treats `items` as a plural key requiring `count`.

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

Plural leaves go through `store.set()` cleanly — `StoreSetContext.value` accepts `string | PluralLeaf` (the `{ "@plural": ... }` wrapper). `FSStore.set` persists them as JSON unchanged.
