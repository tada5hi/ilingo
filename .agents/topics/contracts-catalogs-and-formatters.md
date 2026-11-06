# Catalogs And Formatters

## 6. Template formatters via a per-instance registry

Template placeholders accept modifier syntax: `{{value, formatter}}` and `{{value, formatter(opt=value, ...)}}`. The orchestrator owns a `FormatterRegistry` instance that:

- Holds the built-in formatters `number`, `date`, `list` (backed by `Intl.NumberFormat` / `Intl.DateTimeFormat` / `Intl.ListFormat`).
- Memoises `Intl.*Format` instances keyed by `(formatter, locale, JSON-encoded options)` so repeated renders don't reallocate.
- Exposes `register(name, fn)` / `get(name)` publicly. Two ergonomic entry points sit on `Ilingo`: `registerFormatter(name, fn)` (delegates to the registry) and `IlingoOptions.formatters` (constructor-time bulk registration). Names registered via either surface override the built-ins if they collide.

The locale handed to a formatter is the **resolved** locale (the one that actually yielded the message), not the requested one. Unknown modifiers fall back to `String(value)` and emit a per-instance dev-mode one-shot warning via the same `isProductionEnv()` gate used by the missing-key handler.

`clone()` shares the formatter registry by reference — custom formatters registered on either side are visible to both. Callers that need isolation should build the child instance directly.


## 7. Catalog descriptor tree + shared normalizer

Catalogs are authored as a **tree of tagged descriptor nodes**. `Ilingo` uses an open-world store model: API- and loader-backed stores can hold keys that do not exist at build time. `get(ctx: GetContext)` takes a loose context and returns `string | undefined`.

#### Node grammar

The builders live in `packages/ilingo/src/catalog.ts` and produce tagged nodes:

- `defineCatalog(locales: LocaleNode[])` → `{ type: 'catalog', data }` — the root.
- `defineLocale(name, children)` → `{ type: 'locale', name, data }`.
- `defineNamespace(name, children)` → `{ type: 'namespace', name, data }`.
- `defineTranslations(obj)` → `{ type: 'translations', data }` — flat or key-nested translation strings/plurals.
- `definePlural(forms)` → `{ type: 'plural', data }` — a plural leaf inside a translations body.

```text
CatalogNode   = { type:'catalog',   data: LocaleNode[] }
LocaleNode    = { type:'locale',    name, data: (NamespaceNode | TranslationsNode)[] }
NamespaceNode = { type:'namespace', name, data: (NamespaceNode | TranslationsNode)[] }
TranslationsNode     = { type:'translations',     data: Translations }        // Translations leaves: string | PluralNode | nested Translations
PluralNode    = { type:'plural',    data: PluralForms }
```

Two independent nesting hierarchies:

- A nested **`NamespaceNode`** extends the dotted **namespace** (`app` ▸ `nav` → `'app.nav'`).
- A nested object inside a **`TranslationsNode`** extends the dotted **key** (`{ nav: { home } }` → key `'nav.home'`).

A `TranslationsNode` placed directly under a `LocaleNode` is routed to the default namespace (`''`) by `normalizeCatalog` — the seam for a future optional-namespace API (ergonomics still provisional).

`definePlural` keeps **local** CLDR-category autocomplete and a compile error on missing-`other` / non-CLDR keys (its argument is typed `PluralForms`) — this validation is independent of any catalog-wide inference and survives the type-safe-keys removal.

#### Shared normalizer

`packages/ilingo/src/catalog/normalize.ts` is the single reducer that turns the authoring tree into the internal `Locales` lookup shape every store consumes. Exported from the barrel (`src/index.ts`):

- `normalizeCatalog(input: CatalogInput): Locales` — folds the tree, flattening nested `NamespaceNode`s into dotted namespace keys and merging sibling nodes.
- `normalizeNamespaceBody(body: NamespaceBodyInput): Translations` — reduces a single translations node into a `Translations` record.

`CatalogInput = CatalogNode | LocaleNode[] | LocaleNode` (the root accepts a built `defineCatalog(...)` node, a bare array of locale nodes, or a single locale node). `NamespaceBodyInput = TranslationsNode`.

Every store ingests the tree through this reducer:

- `MemoryStore({ data })` takes a `CatalogInput` and runs `normalizeCatalog` in its constructor. The legacy plain `{ locale: { ns: {…} } }` object is **not accepted** as input.
- `LoaderStore`'s loader returns a `NamespaceBodyInput` (a translations node); `normalizeNamespaceBody` reduces it per `(locale, namespace)`.
- `@ilingo/fs` files are translations nodes — JSON `{ "type": "translations", "data": {…} }`, or `export default defineTranslations({…})`; `persist()` writes `{ type: 'translations', data }`. `FSStore.mergeFiles` uses `isTranslationsNode` + `normalizeNamespaceBody` (the old `isLineRecord` path is gone).


## 8. ESM-first, dependency-light, browser-safe

Each package's runtime dependencies are minimal — `@ebec/core`, `pathtrace` and `smob` in core; `locter`, `pathe`, `smob` in `@ilingo/fs`; `@ebec/core` in the two validup packages (see below). Vue and Vuelidate are declared as `peerDependencies`, not bundled. Core does not import `node:process` — `NODE_ENV` is read via a bare `process.env.NODE_ENV` literal (so Vite / Webpack DefinePlugin can replace it) wrapped in a `typeof process !== 'undefined'` guard for raw-browser execution.
