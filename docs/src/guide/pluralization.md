# Pluralization

Leaves can be **plural objects** keyed by CLDR category (`zero | one | two | few | many | other`). `Ilingo` selects the matching form via `Intl.PluralRules` keyed by the *resolved* locale.

## Two forms

### Explicit (recommended)

Wrap the plural object in `{ "@plural": { ... } }`:

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

The marker disambiguates plurals from regular namespaces that happen to use CLDR-category keys. Use this form in JSON files.

### Structural (back-compat)

A bare `{ one, other }` object is also recognised, **as long as every key is a CLDR category and `other` is present**:

```typescript
{
    cart: {
        items: {
            one: '{{count}} item',
            other: '{{count}} items',
        },
    },
}
```

This is what existing codebases use. New code should prefer the explicit form.

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
await ilingo.get({ group: 'cart', key: 'items', count: 0 }); // 'other' (en has no 'zero')
await ilingo.get({ group: 'cart', key: 'items', count: 1 }); // 'one'
await ilingo.get({ group: 'cart', key: 'items', count: 5 }); // 'other'
```

- If the selected category is **absent**, `other` is used.
- If `other` is also missing on a structural form, the form is not recognised as a plural — the bare object is returned as-is.
- The locale used by `Intl.PluralRules` is the **resolved** locale (the one that actually yielded the leaf), not the requested one. Useful when `en-US → en` falls back and you want the English plural rules to apply.

## Caching

`Intl.PluralRules` instances are cached **per locale** on the `Ilingo` instance. Repeated calls do not reallocate.

## Round-tripping

Plural leaves go through `store.set()` cleanly — `StoreSetContext.value` accepts `string | PluralLeaf`. `FSStore.set` persists them as JSON unchanged.
