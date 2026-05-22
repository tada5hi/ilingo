# Quick Start

A self-contained example. Copy, paste, run.

## 1. Install

```bash
npm install ilingo
```

## 2. Create an instance

```typescript
import { Ilingo, MemoryStore } from 'ilingo';

const ilingo = new Ilingo({
    store: new MemoryStore({
        data: {
            en: {
                cart: {
                    greeting: 'Welcome, {{name}}!',
                    items: {
                        '@plural': {
                            one: '{{count}} item in your cart',
                            other: '{{count}} items in your cart',
                        },
                    },
                },
            },
            de: {
                cart: {
                    greeting: 'Willkommen, {{name}}!',
                    items: {
                        '@plural': {
                            one: '{{count}} Artikel im Warenkorb',
                            other: '{{count}} Artikel im Warenkorb',
                        },
                    },
                },
            },
        },
    }),
    locale: 'en',
});
```

## 3. Translate

```typescript
await ilingo.get({
    group: 'cart',
    key: 'greeting',
    data: { name: 'Peter' },
});
// "Welcome, Peter!"

await ilingo.get({
    group: 'cart',
    key: 'items',
    count: 3,
});
// "3 items in your cart"

await ilingo.get({
    group: 'cart',
    key: 'greeting',
    locale: 'de',
    data: { name: 'Peter' },
});
// "Willkommen, Peter!"
```

That's it. The same call works with a [file-system store](/integrations/fs), in a [Vue app](/integrations/vue), and against a [typed catalog](/guide/type-safe-keys) — the API does not change.

## Where to go next

- **[Stores](/guide/stores)** — the `IStore` port and how to write your own.
- **[Locales & Fallback](/guide/locales)** — how `pt-BR` finds `en` automatically.
- **[Pluralization](/guide/pluralization)** — the `@plural` marker and `definePlural`.
- **[Formatters](/guide/formatters)** — `{{value, number(...)}}` and friends.
- **[Type-Safe Keys](/guide/type-safe-keys)** — `defineCatalog()` + `Ilingo<typeof catalog>`.
