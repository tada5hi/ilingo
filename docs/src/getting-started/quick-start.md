# Quick Start

A self-contained example. Copy, paste, run.

## 1. Install

```bash
npm install ilingo
```

## 2. Create an instance

```typescript
import {
    Ilingo, MemoryStore,
    defineCatalog, defineLocale, defineNamespace, defineTranslations, definePlural,
} from 'ilingo';

const ilingo = new Ilingo({
    store: new MemoryStore({
        data: defineCatalog([
            defineLocale('en', [
                defineNamespace('cart', [
                    defineTranslations({
                        greeting: 'Welcome, {{name}}!',
                        items: definePlural({
                            one: '{{count}} item in your cart',
                            other: '{{count}} items in your cart',
                        }),
                    }),
                ]),
            ]),
            defineLocale('de', [
                defineNamespace('cart', [
                    defineTranslations({
                        greeting: 'Willkommen, {{name}}!',
                        items: definePlural({
                            one: '{{count}} Artikel im Warenkorb',
                            other: '{{count}} Artikel im Warenkorb',
                        }),
                    }),
                ]),
            ]),
        ]),
    }),
    locale: 'en',
});
```

## 3. Translate

```typescript
await ilingo.get({
    namespace: 'cart',
    key: 'greeting',
    data: { name: 'Peter' },
});
// "Welcome, Peter!"

await ilingo.get({
    namespace: 'cart',
    key: 'items',
    count: 3,
});
// "3 items in your cart"

await ilingo.get({
    namespace: 'cart',
    key: 'greeting',
    locale: 'de',
    data: { name: 'Peter' },
});
// "Willkommen, Peter!"
```

That's it. The same call works with a [file-system store](/integrations/fs) and in a [Vue app](/integrations/vue) — the API does not change.

## Where to go next

- **[Catalog Design](/guide/catalog-design)** — the descriptor tree and the five `define*` helpers.
- **[Stores](/guide/stores)** — the `IStore` port and how to write your own.
- **[Locales & Fallback](/guide/locales)** — how `pt-BR` finds `en` automatically.
- **[Pluralization](/guide/pluralization)** — plural nodes via `definePlural`.
- **[Formatters](/guide/formatters)** — `{{value, number(...)}}` and friends.
