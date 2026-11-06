# Configuration

There are no environment variables. All configuration is passed via constructor inputs:

| Object                    | Shape                                                                                                                                |
|---------------------------|--------------------------------------------------------------------------------------------------------------------------------------|
| `new Ilingo(input)`       | `IlingoOptions` — `{ store?: IStore \| IStore[], locale?: string, fallback?: Fallback, onMissingKey?: MissingKeyHandler, formatters?: Record<string, Formatter> }` |
| `new MemoryStore(opts)`   | `MemoryStoreOptions` — `{ data: CatalogInput }`: the descriptor tree (`defineCatalog(...)` / `LocaleNode[]` / a single `LocaleNode`); normalized to `Locales` in the constructor |
| `new FSStore(input)`      | `FSStoreOptionsInput` — `{ directory?: string \| string[], writeDirectory?: string, watch?: boolean, id?: string \| symbol }`        |
| Vue `install(app, input)` | `Options { store, locale } \| Ilingo \| undefined`                                                                                  |

`Fallback = string | string[] | (locale) => string[] | false`. Explicit-empty forms (`[]`, `false`, or a resolver returning `[]`) opt out of fallback entirely — the chain is just `[locale]` with no default-locale tail.
