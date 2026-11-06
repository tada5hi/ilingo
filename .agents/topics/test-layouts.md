# Test Layout

### `packages/ilingo/test/`

```
unit/                               # catalogs built inline with the define* helpers (no shared toCatalog helper)
├── module.spec.ts                  # legacy core behaviour — get/set, locale switching, merge()
├── resolution.spec.ts              # pluralization (incl. the explicit { type:'plural' } node), fallback chain
│                                   #   (default, string, array, function, false, []), missing-key
│                                   #   handler, per-instance warn isolation, serial intra-locale store walk
├── formatters-integration.spec.ts  # end-to-end Ilingo.get() with number/date/list modifiers,
│                                   #   resolved-locale propagation, per-instance cache, dev-warn
├── custom-formatters.spec.ts       # registerFormatter + IlingoOptions.formatters; built-in override; clone shares
├── loader-store.spec.ts            # LoaderStore lazy load, dedupe, cache, miss cache, invalidate, events
├── sync.spec.ts                    # getSync — equivalence with get() (interpolation, plural, fallback,
│                                   #   onMissingKey), throws when an async-only store precedes the hit,
│                                   #   no onMissingKey on that throw, throw vs definite miss,
│                                   #   marker-based error identity, throwSyncUnavailable,
│                                   #   LoaderStore cold/warm/invalidated
├── catalog/
│   └── normalize.spec.ts           # normalizeCatalog — tree→Locales, dotted-namespace nesting, key
│                                   #   nesting, plural node, sibling merge, default-namespace seam
└── utils/
    ├── identify.spec.ts            # isPluralNode / isTranslationsNode / isNamespaceNode / isLocaleNode / isCatalogNode / isPluralForms
    ├── locale.spec.ts              # bcp47Parents, resolveLocaleChain (incl. opt-out forms)
    ├── formatters.spec.ts          # parseFormatterOptions, parseModifier, FormatterRegistry,
    │                               #   template-level modifier dispatch
    └── template.spec.ts            # {{var}} interpolation
data/
└── language/{en,de,fr}/form.{js,ts,json}   # cross-extension loader fixtures — each a translations node
```

`*.spec-d.ts` type tests are gone with the type-safe-keys feature: there is no `test:types` package script and no `typecheck` block in `test/vitest.config.ts` anymore.

### `packages/vue/test/`

```text
unit/
├── component-t.spec.ts         # <ITranslateT> — slot rendering, vars, fragments, error paths
├── directive-t.spec.ts         # v-t directive — string/object bindings, reactive locale, opt-out
├── invalidation.spec.ts        # useTranslation re-runs on IInvalidatingStore.invalidate() (scoped)
├── scoped-catalog.spec.ts      # useScopedCatalog — same-component t, descendant provide, no-leak, fallback
└── ssr.spec.ts                 # @vue/server-renderer: SSR markup carries the translation for
                                #   useTranslation / <ITranslateT> / useScopedCatalog, placeholder
                                #   for a cold LoaderStore, and hydration produces no mismatch (#988)
```

The Vue package uses **happy-dom** for the DOM environment and **@vue/test-utils**'s `mount` + `flushPromises` for component rendering. Plain `nextTick` is not enough — `useTranslation` resolves through `computedAsync`, which needs the microtask queue flushed.

### `packages/fs/test/`

```
unit/
├── module.spec.ts              # FSStore.loadNamespace against test/data/language/ + fallback semantics
├── dotted-namespace.spec.ts    # dotted namespace ↔ dotted filename (app.nav.json): load, key/namespace separation, persist round-trip
├── persist.spec.ts             # set() round-trip, sibling preservation, nested keys,
│                               #   split read/write directories
├── sync.spec.ts                # getSync — reads a cold namespace off disk (no warm-up), the whole
│                               #   extension matrix, definite miss, cache reuse, loadNamespaceSync,
│                               #   answering during an in-flight async load, concurrent async readers,
│                               #   invalidate mid-read, and the async-only-module vs real-fault split
└── watch.spec.ts               # FSStore({ watch: true }) emits invalidate on file change;
                                #   manual invalidate() drops cache; close() teardown is idempotent.
                                #   Needs the optional `chokidar` peer dep installed (it is, devDep).
data/
└── language/{en,de,fr}/form.{cjs,ts,json}  # translations nodes; exercises locter's multi-extension resolution
```

### `packages/validup/test/` + `packages/validup-vue/test/`

```text
validup/test/unit/
├── store.spec.ts
├── translate-issue.spec.ts             # async helpers
└── translate-issue-sync.spec.ts        # *Sync helpers — equivalence with the async path,
                                        #   undefined for an untranslated code, codeless issue,
                                        #   cold LoaderStore, missing getSync, all-or-nothing batches

validup-vue/test/unit/
├── component.spec.ts
└── composables.spec.ts                 # includes the #988 first-render assertions: the seeded
                                        #   message is present *without* a flush, and an
                                        #   untranslated code leaves the first render empty
```

The first-render tests deliberately assert **before** `await flush()` — that is the whole contract. A test that flushes first cannot distinguish a seeded value from an async one.
