# File Structure (architectural layers)

```text
packages/ilingo/src/
├── module.ts                ← orchestrator (Ilingo class)
├── store/{types,memory}     ← port + default adapter
├── catalog.ts               ← defineCatalog / defineLocale / defineNamespace / defineTranslations / definePlural node builders
├── catalog/normalize.ts     ← normalizeCatalog(CatalogInput) → Locales; normalizeNamespaceBody(NamespaceBodyInput) → Translations (shared reducer)
├── errors/
│   ├── constants.ts         ← ILINGO_ERROR_INSTANCE / SYNC_UNAVAILABLE_ERROR_INSTANCE markers (leaf module — breaks the check ↔ class cycle)
│   ├── check.ts             ← isIlingoError, isSyncUnavailableError (matchesInstanceof guards)
│   ├── base.ts              ← IlingoError extends @ebec/core BaseError
│   └── sync-unavailable.ts  ← SyncUnavailableError + throwSyncUnavailable
├── utils/
│   ├── locale.ts            ← bcp47Parents, resolveLocaleChain
│   ├── negotiate.ts         ← negotiateLocale, parseAcceptLanguage (request-side locale picking)
│   ├── identify.ts          ← isPluralNode + node guards isTranslationsNode/isNamespaceNode/isLocaleNode/isCatalogNode, isPluralForms (inner-shape guard)
│   ├── formatters.ts        ← FormatterRegistry (with public register/get), parseFormatterOptions, parseModifier, Formatter type
│   ├── template.ts          ← {{var}} + {{var, formatter(opts)}} substitution; tokenize() for slot-aware renderers
│   └── language/            ← isBCP47LanguageCode + CLDR data
└── config/                  ← typed input shape

packages/fs/src/module.ts            ← second IStore adapter (FSStore, persists set() as JSON)
packages/vue/src/index.ts            ← framework integration (Vue plugin)
packages/vuelidate/src/store/memory.ts ← preloaded MemoryStore (createMemoryStore) for validator names
packages/vuelidate/src/store/loader.ts ← lazy per-locale LoaderStore (createLoaderStore)
```

