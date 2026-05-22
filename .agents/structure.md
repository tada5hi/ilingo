# Project Structure

This is an npm-workspaces monorepo. Every workspace under `packages/` is a publishable library — there are no runnable apps.

## Packages

| Name                                                   | Version | Description                                                                 |
|--------------------------------------------------------|---------|-----------------------------------------------------------------------------|
| [`ilingo`](../packages/ilingo)                         | 5.x     | Framework-agnostic core: `Ilingo` orchestrator, `IStore` port, `MemoryStore`, template formatter, BCP-47 helpers |
| [`@ilingo/fs`](../packages/fs)                         | 5.x     | File-system store adapter — extends `MemoryStore`, lazy-loads `<locale>/<group>.{js,mjs,cjs,ts,mts,json,conf}` |
| [`@ilingo/vue`](../packages/vue)                       | 5.x     | Vue 3 plugin: `install()`, `provide/inject` for the `Ilingo` instance and reactive locale, `<ITranslate>` component, `useTranslation` composable |
| [`@ilingo/vuelidate`](../packages/vuelidate)           | 6.x     | Vuelidate-message adapter on top of `@ilingo/vue` — ships built-in EN/DE/FR/ES translations for validator names |

## Package Dependency Layers

Each layer may only depend on layers below it. Declared in each package's `package.json` (`dependencies` + `peerDependencies`) — that is the authoritative graph; the diagram below is a summary.

```
Foundation:
  ilingo                 (deps: pathtrace, smob)

Layer 1:
  @ilingo/fs             (deps: ilingo, locter, pathe, smob)
  @ilingo/vue            (peer: ilingo, vue, @vueuse/core)

Layer 2:
  @ilingo/vuelidate      (peer: @ilingo/vue, ilingo, vue, @vueuse/core, @vuelidate/core)
```

Nx (`nx.json`) is configured so `build` depends on `^build`, which means workspace builds run in topological order automatically.

## Per-Package Directory Layout

### `packages/ilingo/` — core

```
src/
├── index.ts                  # barrel: re-exports config, module, store, utils, types
├── module.ts                 # Ilingo class — Set<IStore>, locale + fallback chain, plural rules cache,
│                             #   per-instance warn-once memo, get / getResolvedLocale[Chain] / merge / format
├── types.ts                  # LinesRecord, Leaf, PluralLeaf, PluralLeafExplicit, GetContext (with count),
│                             #   MissingKeyContext, MissingKeyHandler, Fallback, FallbackResolver, Data,
│                             #   AnyGroups, Groups, Key, LeafAt, DottedPaths, IsPluralKey, GetParams
├── catalog.ts                # defineCatalog<const T>() + definePlural<const T>() typed helpers
├── constants.ts              # LOCALE_DEFAULT = 'en'
├── config/
│   ├── index.ts
│   └── type.ts               # Config { store, locale, fallback, onMissingKey }; ConfigInput = Partial<Config>
├── store/
│   ├── index.ts              # barrel
│   ├── types.ts              # IStore port, StoreGetContext, StoreSetContext (value: Leaf), MemoryStoreOptions
│   └── memory.ts             # MemoryStore — returns string | PluralLeaf | undefined
└── utils/
    ├── index.ts
    ├── locale.ts             # bcp47Parents, resolveLocaleChain
    ├── identify.ts           # PLURAL_MARKER + isPluralLeaf, isPluralLeafExplicit, asPluralLeaf, isLineRecord
    ├── formatters.ts         # FormatterRegistry, parseFormatterOptions, parseModifier, Formatter type
    ├── template.ts           # {{var}} + {{var, formatter(opts)}} interpolation
    └── language/
        ├── index.ts
        ├── module.ts         # isBCP47LanguageCode
        └── data.json         # BCP-47 language code table
test/
└── unit/
    ├── module.spec.ts                # legacy core behaviour
    ├── resolution.spec.ts            # plural, fallback chain, missing-key handler, parallel lookup
    ├── formatters-integration.spec.ts # Ilingo.get() with number/date/list modifiers, cache + dev-warn
    ├── types.spec-d.ts               # compile-time-only — run via `npm run test:types` (vitest typecheck)
    └── utils/
        ├── locale.spec.ts            # bcp47Parents, resolveLocaleChain (incl. opt-out forms)
        ├── formatters.spec.ts        # parseFormatterOptions, parseModifier, FormatterRegistry, template dispatch
        ├── identify.spec.ts
        └── template.spec.ts
```

### `packages/fs/` — file-system adapter

```
src/
├── index.ts                  # barrel
├── module.ts                 # FSStore extends MemoryStore — directory[], writeDirectory,
│                             #   lazy loadGroup(), atomic persist() (write-tmp + rename)
├── types.ts                  # ConfigInput, Config (now includes writeDirectory)
└── utils.ts                  # buildConfig (normalize directory[] + writeDirectory)
test/
├── unit/
│   ├── module.spec.ts        # loads test/data/language/<locale>/<group>.* via FSStore
│   └── persist.spec.ts       # set() round-trip, sibling preservation, split read/write dirs
└── data/language/{en,de,fr}/form.{cjs,ts,json}
```

### `packages/vue/` — Vue 3 plugin

```
src/
├── index.ts                  # install(), applyInstallInput(), default Plugin export, ITranslate re-export
├── component.vue             # <ITranslate> component
├── helpers.ts
├── types.ts                  # Options, GetContextReactive, etc.
└── composables/
    ├── index.ts
    ├── instance.ts           # provideIlingo / injectIlingo / injectIlingoSafe
    ├── locale.ts             # provideLocale / injectLocale / injectLocaleSafe (Ref<string>)
    ├── use-translation.ts    # useTranslation(ctx): Ref<string> via computedAsync
    └── utils.ts              # extractReactiveData
playground/                   # local Vue app for manual testing (vite dev)
index.html, vite.config.js    # vite dev entry
```

### `packages/vuelidate/` — Vuelidate adapter

```
src/
├── index.ts                  # install() — chains @ilingo/vue install + ensures Vuelidate Store is registered
├── store.ts                  # Store extends MemoryStore — pre-seeds en/de/fr/es 'vuelidate' group
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

## Separation of Concerns

- **`ilingo`** owns the domain: locale lookup, store iteration order, `{{var}}` template formatting, BCP-47 validation.
- **`@ilingo/fs`** owns I/O — loading translation files from disk via `locter` and merging them with `smob`.
- **`@ilingo/vue`** owns Vue integration: provide/inject of the `Ilingo` instance, reactive locale, component, composable.
- **`@ilingo/vuelidate`** owns the Vuelidate use case: a `Store` pre-populated with validator-message translations and the composables that wire Vuelidate's `$errors` shape into ilingo.
