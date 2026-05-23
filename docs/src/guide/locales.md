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

## Negotiating a locale from a request

For server-side apps (Express / Hono / Nuxt server routes) or browser apps reading `navigator.languages`, pick the best supported locale via `negotiateLocale`:

```typescript
import { Ilingo, negotiateLocale, parseAcceptLanguage } from 'ilingo';

const supported = ['en', 'de', 'pt-BR'];

// From an HTTP Accept-Language header:
const requested = parseAcceptLanguage('en-US,en;q=0.9,de;q=0.8');
// → ['en-US', 'en', 'de']

const chosen = negotiateLocale(supported, requested) ?? 'en';
ilingo.setLocale(chosen);
```

`negotiateLocale` implements BCP-47 best-match:

1. **Exact match** — requested tag identical to a supported one (case-insensitive language sub-tag).
2. **Prefix match** — requested `'pt'` matches supported `'pt-BR'`.
3. **Parent walk** — requested `'pt-PT-Latn'` walks parents (`'pt-PT'` → `'pt'`) against supported.

Returns the first supported tag that matches, or `undefined` if none did. Compose with your own default:

```typescript
ilingo.setLocale(negotiateLocale(supported, requested) ?? 'en');
```

`parseAcceptLanguage(header)` parses the RFC 9110 header into a quality-sorted array, dropping the `*` wildcard. Tags without an explicit `q=` default to `q=1.0`. Both functions are pure — they don't mutate `Ilingo` state.
