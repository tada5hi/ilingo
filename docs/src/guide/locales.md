# Locales & Fallback

Every `get()` call resolves a **locale chain** before querying anything. The chain is walked locale-first: closer locale beats farther locale regardless of store insertion order.

## Default chain

Derived from BCP-47 parents of the requested locale, terminating at `'en'`:

```typescript
new Ilingo({ locale: 'pt-BR' })
    .getResolvedLocaleChain({ locale: 'pt-BR' });
// ['pt-BR', 'pt', 'en']
```

`'en'` is pinned at the terminal position — it cannot be reordered out by an earlier mention.

## Overriding the chain

`fallback` accepts a string, an array, a function, or `false`:

```typescript
// Single string fallback
new Ilingo({ fallback: 'es' });

// Explicit chain
new Ilingo({ fallback: ['es', 'fr'] });

// Per-request resolver
new Ilingo({
    fallback: (locale) => locale.startsWith('pt') ? ['es'] : [],
});

// Disable fallback entirely
new Ilingo({ fallback: false });
new Ilingo({ fallback: [] });
```

Explicit-empty forms (`[]`, `false`, or a resolver returning `[]`) opt out completely — the chain is just `[locale]` with no default-locale tail.

## Inspecting resolution

Two helpers are exposed for debugging and observability:

```typescript
// Show the chain that would be walked
ilingo.getResolvedLocaleChain({ locale: 'pt-BR' });
// ['pt-BR', 'pt', 'en']

// Which locale actually yielded a value?
await ilingo.getResolvedLocale({ group: 'app', key: 'hi' });
// 'pt'   (e.g. when 'pt-BR' had no entry but 'pt' did)
// undefined   (when no store had the key anywhere in the chain)
```

These are read-only — they do not memoise into `data`, run formatters, or trigger the missing-key handler. Use them when you want to log "served `key` from `pt` while user asked for `pt-BR`" or build a coverage dashboard.

## Setting the active locale

```typescript
ilingo.setLocale('de');                // permanent
await ilingo.get({ group: 'app', key: 'hi' });           // uses 'de'
await ilingo.get({ group: 'app', key: 'hi', locale: 'fr' }); // one-off override
```

In Vue, the locale is exposed as a `Ref<string>` — see [Integrations → Vue](/integrations/vue).
