# Per-Package Directory Layout

Each package holds an `assets/logo.svg` next to `src/` (omitted from the trees below).

### `packages/ilingo/` — core

```
src/
├── index.ts                  # barrel: re-exports config, module, store, utils, types
├── module.ts                 # IIlingo interface + Ilingo class — Map<symbol|string,IStore> + registerStore(store),
│                             #   locale + fallback chain, plural rules cache,
│                             #   per-instance warn-once memo, get / getSync (+ lookupSync, SSR path) /
│                             #   getResolvedLocale[Chain] / merge / format
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
├── errors/
│   ├── index.ts              # barrel
│   ├── constants.ts          # ILINGO_ERROR_INSTANCE / SYNC_UNAVAILABLE_ERROR_INSTANCE markers
│   │                         #   (Symbol.for('ilingo/<ClassName>')) — kept apart from the classes
│   │                         #   so check.ts reads them without a runtime import cycle
│   ├── check.ts              # isIlingoError / isSyncUnavailableError — matchesInstanceof guards
│   │                         #   (mirrors @ebec/core's helpers/check.ts)
│   ├── base.ts               # IlingoError extends @ebec/core BaseError; marks itself on the
│   │                         #   @instanceof chain so instanceof survives duplicate package
│   │                         #   copies + a toJSON round-trip (Symbol.hasInstance → the guard)
│   └── sync-unavailable.ts   # SyncUnavailableError (locale/namespace/key/storeId, + toJSON)
│                             #   + throwSyncUnavailable helper
├── options/
│   ├── index.ts
│   └── types.ts              # IlingoOptions { store?: IStore | IStore[], locale?, fallback?, onMissingKey?, formatters? } — all fields optional (defaults applied at runtime)
├── store/
│   ├── index.ts              # barrel
│   ├── types.ts              # IStore port (id / get / getSync / getLocales), StoreGetContext,
│   │                         #   StoreSetContext (value: string | PluralNode), MemoryStoreOptions,
│   │                         #   IMutableStore + IInvalidatingStore (+ their guards)
│   ├── memory.ts             # MemoryStore — takes CatalogInput (runs normalizeCatalog in ctor); get()/getSync() both delegate to a protected resolve(); never throws SyncUnavailableError
│   └── loader.ts             # LoaderStore — lazy load + per-(locale,namespace) cache + invalidate; getSync() answers cache-only (throws while cold)
└── utils/
    ├── index.ts
    ├── locale.ts             # bcp47Parents, resolveLocaleChain
    ├── negotiate.ts          # negotiateLocale, parseAcceptLanguage (BCP-47 best-match)
    ├── identify.ts           # isPluralNode + node guards isTranslationsNode/isNamespaceNode/isLocaleNode/isCatalogNode, isPluralForms (inner-shape guard)
    ├── formatters.ts         # FormatterRegistry (with public register/get), parseFormatterOptions, parseModifier, Formatter type
    ├── template.ts           # {{var}} + {{var, formatter(opts)}} interpolation + tokenize() for slot-aware renderers (Vue)
    ├── translations-record.ts # parseTranslationsRecord(Translations) → {key,value}[] (flatten nested keys to dotted; used by validup/vuelidate stores)
    └── language/
        ├── index.ts
        ├── module.ts         # isBCP47LanguageCode
        └── data.json         # BCP-47 language code table
test/
└── unit/                             # catalogs built inline with the define* helpers (no shared toCatalog helper)
    ├── module.spec.ts                # legacy core behaviour
    ├── resolution.spec.ts            # plural, fallback chain, missing-key handler, serial store walk, clone()
    ├── formatters-integration.spec.ts # Ilingo.get() with number/date/list modifiers, cache + dev-warn
    ├── custom-formatters.spec.ts     # registerFormatter + IlingoOptions.formatters constructor sugar
    ├── loader-store.spec.ts          # LoaderStore lazy load, cache, miss cache, dedupe, invalidate, events
    ├── sync.spec.ts                  # getSync — equivalence with get(), throw when a store needs I/O,
    │                                 #   throw vs definite miss, error identity across copies
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
├── types.ts                  # FSStoreOptionsInput (input) + FSStoreOptions (resolved, includes writeDirectory + watch)
└── utils.ts                  # normalizeOptions (normalize directory[] + writeDirectory)
test/
├── unit/
│   ├── module.spec.ts        # loads test/data/language/<locale>/<namespace>.* via FSStore
│   ├── dotted-namespace.spec.ts # dotted namespace ↔ dotted-filename resolution (app.nav.json)
│   ├── persist.spec.ts       # set() round-trip, sibling preservation, split read/write dirs
│   ├── sync.spec.ts          # getSync — throws while cold/in-flight, warm after get(), cold again after invalidate
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
└── unit/                     # catalogs built inline with the define* helpers (no shared toCatalog helper)
    ├── component-t.spec.ts   # <ITranslateT> rendering (slots, vars, fragments, error paths)
    ├── directive-t.spec.ts   # v-t directive (string/object bindings, reactive locale, opt-out)
    ├── scoped-catalog.spec.ts# useScopedCatalog (same-component t, descendant provide, no-leak, fallback)
    └── ssr.spec.ts           # renderToString writes real translations (#988) + hydrates without mismatch
playground/                   # local Vue app for manual testing (vite dev)
index.html, vite.config.js    # vite dev entry
```

### `packages/vuelidate/` — Vuelidate adapter

```
src/
├── index.ts                  # install() — chains @ilingo/vue install + registers the vuelidate catalog store (STORE_ID-keyed, idempotent)
├── store/
│   ├── memory.ts             # createMemoryStore() / Store extends MemoryStore — pre-seeds en/de/fr/es 'vuelidate' namespace; extendStore() seeds an existing store
│   └── loader.ts             # createLoaderStore() — lazy per-locale LoaderStore, keyed by STORE_ID
├── component.ts              # Vuelidate-specific component
├── constants.ts              # NAMESPACE = 'vuelidate', STORE_ID = Symbol.for('@ilingo/vuelidate'), Severity / SlotName enums
├── helpers/severity.ts
├── translations/             # en.ts, de.ts, fr.ts, es.ts — built-in validator messages
├── composables/              # use-severity, use-translations-for-base-validation, ...-nested-validations
├── utils/                    # has-own-property, object, validation-rule-result
└── types.ts
playground/                   # local Vue app for manual testing
```
