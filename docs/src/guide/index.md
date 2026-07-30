# Overview

ilingo follows a small **port-and-adapter** design. Three pieces:

```
┌──────────────────────────────────┐
│           Ilingo                 │   ← orchestrator
│  (locale chain + store walk +    │
│   pluralization + templating)    │
└──────────────────────────────────┘
              │
              ▼
┌──────────────────────────────────┐
│            IStore                │   ← read port
│  get(ctx)                        │
│  getLocales()                    │
└──────────────────────────────────┘
   + set(ctx)        → opt-in IMutableStore
   + invalidate(...) → opt-in IInvalidatingStore
              ▲
              │ implements
   ┌──────────┴──────────┐
   │                     │
MemoryStore           FSStore           ← stock adapters
                     (@ilingo/fs)
```

## The flow of a `get()`

```
Input: { namespace, key, locale?, data?, count? }

1. requestedLocale = ctx.locale ?? instance default
2. chain           = resolveLocaleChain(requested, fallback config, 'en')
3. lookup:
       for each locale in chain:
           for each store in insertion order:
               return on first defined candidate
4. miss?           → handleMissingKey → onMissingKey or warn-once default
5. selectPluralForm(leaf, hitLocale, count)
6. template(message, data, { locale: hitLocale, formatters })
```

The chain is walked **locale-first**: the closest locale beats the farthest one regardless of which store holds the value. Within a single locale, stores are queried **serially in insertion order** and the walk stops at the first hit — later stores are not pre-fetched, so an expensive adapter never fires when a cheap one has already answered.

`getSync()` runs the identical pipeline without awaiting, for call sites that need a string *now* — the first render of a server-rendered component. It succeeds when every store consulted before the hit can answer from memory, and returns `undefined` otherwise. See [Stores → Synchronous reads](./stores#synchronous-reads-getsync).

## Concepts

| Concept | Page |
|---|---|
| Catalog shape + JSON-vs-TS authoring | [Catalog Design](./catalog-design) |
| Pluggable storage backend | [Stores](./stores) |
| BCP-47 fallback chain     | [Locales & Fallback](./locales) |
| `{{var}}` substitution + data merging | [Templates & Data](./templates) |
| CLDR-category plural selection | [Pluralization](./pluralization) |
| `Intl.NumberFormat` / `Intl.DateTimeFormat` / `Intl.ListFormat` | [Formatters](./formatters) |
| Custom miss reporting | [Missing-Key Handler](./missing-key) |
| Synchronous reads for SSR (`getSync`) | [Stores](./stores#synchronous-reads-getsync) · [SSR recipe](../recipes/ssr) |
