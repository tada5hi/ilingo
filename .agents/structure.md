# Project Structure

This is an npm-workspaces monorepo. Workspaces under `packages/` are publishable libraries; the `docs/` workspace is a private VitePress site that deploys to GitHub Pages. There are no runnable end-user apps.

## Packages

| Name                                                   | Version | Description                                                                 |
|--------------------------------------------------------|---------|-----------------------------------------------------------------------------|
| [`ilingo`](../packages/ilingo)                         | 5.x     | Framework-agnostic core: `Ilingo` orchestrator, `IStore` port, `MemoryStore`, template formatter, BCP-47 helpers |
| [`@ilingo/fs`](../packages/fs)                         | 5.x     | File-system store adapter — extends `MemoryStore`, lazy-loads `<locale>/<namespace>.{js,mjs,cjs,ts,mts,json,conf}` |
| [`@ilingo/vue`](../packages/vue)                       | 5.x     | Vue 3 plugin: `install()`, `provide/inject` for the `Ilingo` instance and reactive locale, `<ITranslate>` component, `useTranslation` composable |
| [`@ilingo/vuelidate`](../packages/vuelidate)           | 6.x     | Vuelidate-message adapter on top of `@ilingo/vue` — ships built-in EN/DE/FR/ES translations for validator names |
| [`@ilingo/validup`](../packages/validup)               | 0.1.x   | Framework-agnostic core for the validup ecosystem. **Data-free `.` entry**: `translateIssue` / `translateIssues` helpers, `NAMESPACE` / `STORE_ID` constants. Catalog stores live on subpaths — `./store/memory` (`createMemoryStore()`, eager, all locales — builds its catalog via `defineCatalog([...])`) and `./store/loader` (`createLoaderStore()`, lazy per-locale `import()` chunks returning `defineTranslations(...)`), each keyed by `STORE_ID`; register with `ilingo.registerStore(...)`. **No Vue deps** — embeddable in Node SSR, edge, workers. Peer-deps `ilingo`, `validup`. |
| [`@ilingo/validup-vue`](../packages/validup-vue)       | 0.1.x   | Vue 3 plugin for `@ilingo/validup`. The `install` hook, five composables (`useTranslationsForField`, `useTranslationsForComposable`, `useTranslationsForIssues`, `useTranslationsForGroupErrors`, `useFieldFeedback`), the `<IValidup>` renderless component (leaf `:issues` mode + whole-form `:composable` mode with `#cross-cutting`/`#groups`/`#fields` slots), the slot-aware `<IValidupT>` (component-aware interpolation via `<ITranslateT>`), and the `FieldTranslations` / `GroupTranslations` / `FieldFeedback` aliases. Mirrors the `validup` → `@validup/vue` split. Peer-deps `@ilingo/validup`, `@ilingo/vue`, `ilingo`, `vue`, `@vueuse/core`, `validup`, `@validup/vue`. |
| [`@ilingo/docs`](../docs)                              | private | VitePress 1.x marketing + reference site. Deploys to GitHub Pages via `.github/workflows/docs.yml`. Never published to npm. |

## Package Dependency Layers

Each layer may only depend on layers below it. Declared in each package's `package.json` (`dependencies` + `peerDependencies`) — that is the authoritative graph; the diagram below is a summary.

```
Foundation:
  ilingo                 (deps: pathtrace, smob)

Layer 1:
  @ilingo/fs             (deps: ilingo, locter, pathe, smob)
  @ilingo/vue            (peer: ilingo, vue, @vueuse/core)

Layer 1.5:
  @ilingo/validup        (peer: ilingo, validup)        # framework-agnostic

Layer 2:
  @ilingo/vuelidate      (peer: @ilingo/vue, ilingo, vue, @vueuse/core, @vuelidate/core)
  @ilingo/validup-vue    (peer: @ilingo/validup, @ilingo/vue, ilingo, vue, @vueuse/core, validup, @validup/vue)
```

Nx (`nx.json`) is configured so `build` depends on `^build`, which means workspace builds run in topological order automatically.

## Per-Package Directory Layout

### `packages/ilingo/` — core

```
src/
├── index.ts                  # barrel: re-exports config, module, store, utils, types
├── module.ts                 # IIlingo interface + Ilingo class — Map<symbol|string,IStore> + registerStore(store),
│                             #   locale + fallback chain, plural rules cache,
│                             #   per-instance warn-once memo, get / getResolvedLocale[Chain] / merge / format
├── types.ts                  # normalized data shapes: Translations / Namespaces / Locales, Leaf, PluralForms;
│                             #   descriptor-tree node types: PluralNode, TranslationsNode, NamespaceNode,
│                             #   NamespaceChild, LocaleNode, CatalogNode, CatalogInput, NamespaceBodyInput;
│                             #   GetContext (with count), MissingKeyContext, MissingKeyHandler,
│                             #   Fallback, FallbackResolver, Data, IIlingo (no generics — type-safe-key
│                             #   inference helpers Key/LeafAt/DottedPaths/IsPluralKey/GetParams/
│                             #   LocalesNamespace/AnyLocalesNamespace + PluralLeaf were removed)
├── catalog.ts                # node builders: defineCatalog([locales]) / defineLocale(name, children) /
│                             #   defineNamespace(name, children) / defineTranslations(obj) / definePlural(forms)
├── catalog/
│   └── normalize.ts          # normalizeCatalog(CatalogInput) → Locales;
│                             #   normalizeNamespaceBody(NamespaceBodyInput) → Translations
│                             #   (shared reducer every store uses; exported from the barrel)
├── constants.ts              # LOCALE_DEFAULT = 'en'
├── config/
│   ├── index.ts
│   └── type.ts               # Config { store?, locale?, fallback?, onMissingKey?, formatters? } — all fields optional (defaults applied at runtime); ConfigInput = back-compat alias
├── store/
│   ├── index.ts              # barrel
│   ├── types.ts              # IStore port, StoreGetContext, StoreSetContext (value: string | PluralNode),
│   │                         #   MemoryStoreOptions, IInvalidatingStore + isInvalidatingStore guard
│   ├── memory.ts             # MemoryStore — takes CatalogInput (runs normalizeCatalog in ctor); get() returns string | PluralForms | undefined (unwraps the plural node's .data)
│   └── loader.ts             # LoaderStore — lazy load + per-(locale,namespace) cache + invalidate
└── utils/
    ├── index.ts
    ├── locale.ts             # bcp47Parents, resolveLocaleChain
    ├── negotiate.ts          # negotiateLocale, parseAcceptLanguage (BCP-47 best-match)
    ├── identify.ts           # isPluralNode + node guards isTranslationsNode/isNamespaceNode/isLocaleNode/isCatalogNode, isPluralForms (inner-shape guard)
    ├── formatters.ts         # FormatterRegistry (with public register/get), parseFormatterOptions, parseModifier, Formatter type
    ├── template.ts           # {{var}} + {{var, formatter(opts)}} interpolation + tokenize() for slot-aware renderers (Vue)
    └── language/
        ├── index.ts
        ├── module.ts         # isBCP47LanguageCode
        └── data.json         # BCP-47 language code table
test/
├── helpers/
│   └── catalog.ts                    # converts the legacy {locale:{ns:translations}} shape to a descriptor tree (keeps contract tests concise)
└── unit/
    ├── module.spec.ts                # legacy core behaviour
    ├── resolution.spec.ts            # plural, fallback chain, missing-key handler, serial store walk, clone()
    ├── formatters-integration.spec.ts # Ilingo.get() with number/date/list modifiers, cache + dev-warn
    ├── custom-formatters.spec.ts     # registerFormatter + Config.formatters constructor sugar
    ├── loader-store.spec.ts          # LoaderStore lazy load, cache, miss cache, dedupe, invalidate, events
    ├── catalog/
    │   └── normalize.spec.ts         # normalizeCatalog (tree→Locales, dotted-namespace nesting, key nesting,
    │                                 #   plural node, sibling merge, default-namespace seam)
    └── utils/
        ├── locale.spec.ts            # bcp47Parents, resolveLocaleChain (incl. opt-out forms)
        ├── negotiate.spec.ts         # negotiateLocale + parseAcceptLanguage
        ├── formatters.spec.ts        # parseFormatterOptions, parseModifier, FormatterRegistry, template dispatch
        ├── identify.spec.ts
        └── template.spec.ts
bench/
├── vitest.config.ts                  # vitest bench config; writes results.json (gitignored)
├── setup.ts                          # shared catalog + makeIlingo() / makeI18next() factories
├── get-cache-hit.bench.ts            # baseline: simple-string leaf hit
├── fallback.bench.ts                 # 3-deep BCP-47 fallback walk
├── plural.bench.ts                   # plural form selection
└── format.bench.ts                   # template + Intl.NumberFormat modifier
```

### `packages/fs/` — file-system adapter

```
src/
├── index.ts                  # barrel
├── module.ts                 # FSStore extends MemoryStore — directory[], writeDirectory,
│                             #   lazy loadNamespace(), atomic persist() (write-tmp + rename)
├── types.ts                  # ConfigInput, Config (now includes writeDirectory)
└── utils.ts                  # buildConfig (normalize directory[] + writeDirectory)
test/
├── unit/
│   ├── module.spec.ts        # loads test/data/language/<locale>/<namespace>.* via FSStore
│   ├── persist.spec.ts       # set() round-trip, sibling preservation, split read/write dirs
│   └── watch.spec.ts         # watch: true emits invalidate on file change, close() teardown
└── data/language/{en,de,fr}/form.{cjs,ts,json}   # translations nodes — JSON `{ "type":"translations", "data":{…} }` / `export default defineTranslations({…})`
```

### `packages/vue/` — Vue 3 plugin

```
src/
├── index.ts                  # install(), applyInstallInput(), default Plugin export,
│                             #   ITranslate / ITranslateT re-export, v-t directive registration
├── component.vue             # <ITranslate> component (plain {{var}} substitution)
├── component-t.ts            # <ITranslateT> — slot-aware renderer (uses tokenize from core)
├── helpers.ts
├── types.ts                  # Options (incl. directives?: boolean), GetContextReactive, DataMaybeRef
├── directives/
│   └── t.ts                  # createVTDirective(): reactive locale-tracking v-t directive
└── composables/
    ├── index.ts
    ├── instance.ts           # provideIlingo / injectIlingo / injectIlingoSafe
    ├── locale.ts             # provideLocale / injectLocale / injectLocaleSafe (Ref<string>)
    ├── use-translation.ts    # useTranslation(ctx): Ref<string> via computedAsync
    ├── use-scoped-catalog.ts # useScopedCatalog({ messages }) → { instance, t } + provides scoped Ilingo
    └── utils.ts              # extractReactiveData
test/                         # happy-dom + @vue/test-utils via vitest
├── helpers/
│   └── catalog.ts            # mirror of the core helper — {locale:{ns:translations}} → descriptor tree
└── unit/
    ├── component-t.spec.ts   # <ITranslateT> rendering (slots, vars, fragments, error paths)
    ├── directive-t.spec.ts   # v-t directive (string/object bindings, reactive locale, opt-out)
    └── scoped-catalog.spec.ts# useScopedCatalog (same-component t, descendant provide, no-leak, fallback)
playground/                   # local Vue app for manual testing (vite dev)
index.html, vite.config.js    # vite dev entry
```

### `packages/vuelidate/` — Vuelidate adapter

```
src/
├── index.ts                  # install() — chains @ilingo/vue install + ensures Vuelidate Store is registered
├── store.ts                  # Store extends MemoryStore — pre-seeds en/de/fr/es 'vuelidate' namespace
├── component.ts              # Vuelidate-specific component
├── constants.ts
├── helpers/severity.ts
├── translations/             # en.ts, de.ts, fr.ts, es.ts — built-in validator messages
├── composables/              # use-severity, use-translations-for-base-validation, ...-nested-validations
├── utils/                    # has-own-property, object, validation-rule-result
└── types.ts
playground/                   # local Vue app for manual testing
```

## Package Exports

All four packages use ESM (`"type": "module"`) and ship type declarations alongside `.mjs` bundles in `dist/`.

| Package            | Subpath exports                                |
|--------------------|------------------------------------------------|
| `ilingo`           | `.`                                            |
| `@ilingo/fs`       | `.`, `./core`                                  |
| `@ilingo/vue`      | `.`, `./core`                                  |
| `@ilingo/vuelidate`| `.`, `./core`, `./vue`                         |

The public API is whatever the package's `src/index.ts` re-exports. Anything not re-exported from there should be considered internal even if a subpath import would technically reach it.

### `docs/` — VitePress site (private)

```
docs/
├── package.json              # @ilingo/docs, private. scripts: dev / build / preview (vitepress src)
├── tsconfig.json
└── src/
    ├── index.md              # layout: page — composes the 5 marketing components below
    ├── public/logo.svg
    ├── .vitepress/
    │   ├── config.mts        # title, nav, sidebar, head meta, editLink, search
    │   └── theme/
    │       ├── index.ts      # extends DefaultTheme; imports style.css
    │       ├── style.css     # --il-color-* design tokens (light + .dark)
    │       └── components/
    │           ├── Hero.vue                  # live translation playground (locale + count + name + amount)
    │           ├── FeatureGrid.vue           # 6-card feature grid
    │           ├── IntegrationShowcase.vue   # 5 cards: @ilingo/fs, @ilingo/vue, @ilingo/vuelidate, @ilingo/validup, @ilingo/validup-vue
    │           ├── CodeTabs.vue              # Install / Define / Translate tabs w/ copy button
    │           └── VueSpotlight.vue          # 2-col spotlight for @ilingo/vue
    ├── getting-started/
    │   ├── index.md          # Introduction
    │   ├── installation.md
    │   └── quick-start.md
    ├── guide/
    │   ├── index.md          # conceptual overview + sitemap
    │   ├── catalog-design.md
    │   ├── stores.md
    │   ├── locales.md
    │   ├── templates.md
    │   ├── pluralization.md
    │   ├── formatters.md
    │   └── missing-key.md
    ├── integrations/
    │   ├── index.md
    │   ├── fs.md
    │   ├── vue.md
    │   ├── vuelidate.md
    │   ├── validup.md         # @ilingo/validup (framework-agnostic core)
    │   └── validup-vue.md     # @ilingo/validup-vue (Vue layer)
    └── recipes/
        └── ssr.md            # per-request Ilingo, hydration, Nuxt + Astro slots
```

The sidebar in `config.mts` is the source of truth for what pages should exist — adding a markdown file under `src/guide/` is not enough, it must also be referenced in the sidebar config.

## Separation of Concerns

- **`ilingo`** owns the domain: locale lookup, store iteration order, `{{var}}` template formatting, BCP-47 validation.
- **`@ilingo/fs`** owns I/O — loading translation files from disk via `locter` and merging them with `smob`.
- **`@ilingo/vue`** owns Vue integration: provide/inject of the `Ilingo` instance, reactive locale, component, composable.
- **`@ilingo/vuelidate`** owns the Vuelidate use case: a `Store` pre-populated with validator-message translations and the composables that wire Vuelidate's `$errors` shape into ilingo.
- **`@ilingo/docs`** owns the marketing and reference site. Imports the public APIs only — never reaches into a package's `src/`. Free to depend on any published `ilingo` package via workspace symlink.
