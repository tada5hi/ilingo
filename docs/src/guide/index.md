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
│            IStore                │   ← port
│  get(locale, group, key)         │
│  set(...)                        │
│  getLocales()                    │
└──────────────────────────────────┘
              ▲
              │ implements
   ┌──────────┴──────────┐
   │                     │
MemoryStore           FSStore           ← stock adapters
                     (@ilingo/fs)
```

## The flow of a `get()`

```
Input: { group, key, locale?, data?, count? }

1. requestedLocale = ctx.locale ?? instance default
2. chain           = resolveLocaleChain(requested, fallback config, 'en')
3. lookup:
       for each locale in chain:
           query every store in parallel
           first defined candidate (in declared store order) wins
4. miss?           → handleMissingKey → onMissingKey or warn-once default
5. selectPluralForm(leaf, hitLocale, count)
6. template(message, data, { locale: hitLocale, formatters })
```

The chain is walked **locale-first**: the closest locale beats the farthest one regardless of which store holds the value. Within a single locale, all stores are queried concurrently and the first declared store with a hit wins.

## Concepts

| Concept | Page |
|---|---|
| Pluggable storage backend | [Stores](./stores) |
| BCP-47 fallback chain     | [Locales & Fallback](./locales) |
| <code v-pre>{{var}}</code> substitution + data merging | [Templates & Data](./templates) |
| CLDR-category plural selection | [Pluralization](./pluralization) |
| `Intl.NumberFormat` / `Intl.DateTimeFormat` / `Intl.ListFormat` | [Formatters](./formatters) |
| Compile-time typo prevention | [Type-Safe Keys](./type-safe-keys) |
| Custom miss reporting | [Missing-Key Handler](./missing-key) |
