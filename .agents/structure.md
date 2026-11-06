# Project Structure

This is an npm-workspaces monorepo. Workspaces under `packages/` are publishable libraries; the `docs/` workspace is a private VitePress site that deploys to GitHub Pages. There are no runnable end-user apps.

## Packages

| Name                                                   | Version | Description                                                                 |
|--------------------------------------------------------|---------|-----------------------------------------------------------------------------|
| [`ilingo`](../packages/ilingo)                         | 5.x     | Framework-agnostic core: `Ilingo` orchestrator, `IStore` port, `MemoryStore`, template formatter, BCP-47 helpers |
| [`@ilingo/fs`](../packages/fs)                         | 5.x     | File-system store adapter — extends `MemoryStore`, lazy-loads `<locale>/<namespace>.{js,mjs,cjs,ts,mts,json,conf}` through locter v4 (`readAsModule`/`readAsModuleSync`); answers `getSync` by reading the file synchronously |
| [`@ilingo/vue`](../packages/vue)                       | 5.x     | Vue 3 plugin: `install()`, `provide/inject` for the `Ilingo` instance and reactive locale, `<ITranslate>` component, `useTranslation` composable |
| [`@ilingo/vuelidate`](../packages/vuelidate)           | 6.x     | Vuelidate-message adapter on top of `@ilingo/vue` — ships built-in EN/DE/FR/ES translations for validator names |
| [`@ilingo/validup`](../packages/validup)               | 0.1.x   | Framework-agnostic core for the validup ecosystem. **Data-free `.` entry**: `translateIssue` / `translateIssues` / `translateIssueGroups` (+ the synchronous `translateIssueSync` / `translateIssuesSync` / `translateIssueGroupsSync` for seeding SSR first renders) / `coerceIssueData` helpers, `NAMESPACE` / `STORE_ID` constants, `SlotName` enum + slot-prop types. Catalog stores live on subpaths — `./store/memory` (`createMemoryStore()`, eager, all locales — builds its catalog via `defineCatalog([...])`) and `./store/loader` (`createLoaderStore()`, lazy per-locale `import()` chunks returning `defineTranslations(...)`), each keyed by `STORE_ID`; register with `ilingo.registerStore(...)`. **No Vue deps** — embeddable in Node SSR, edge, workers. Peer-deps `ilingo`, `validup`. |
| [`@ilingo/validup-vue`](../packages/validup-vue)       | 0.1.x   | Vue 3 plugin for `@ilingo/validup`. The `install` hook, five composables (`useTranslationsForField`, `useTranslationsForComposable`, `useTranslationsForIssues`, `useTranslationsForGroupErrors`, `useFieldValidation` — all **`setup()`-only**, like every composable here, since they wire a `computedAsync` watcher that only the setup scope disposes), the `<IValidup>` renderless component (leaf `:issues` mode + whole-form `:composable` mode with `#cross-cutting`/`#groups`/`#fields` slots), the slot-aware `<IValidupT>` (component-aware interpolation via `<ITranslateT>`), the renderless `<IFieldValidation>` (template-only companion to `useFieldValidation` — owns the watcher lifecycle in its own setup so the bundle can be bound in a template without the inline-call leak #965; default slot exposes the bundle as `value`), and the `FieldTranslations` / `GroupTranslations` / `FieldValidation` aliases (`useFieldValidation`/`FieldValidation` align with vuecs's `<VCFormGroup :validation>`). Mirrors the `validup` → `@validup/vue` split. Peer-deps `@ilingo/validup`, `@ilingo/vue`, `ilingo`, `vue`, `@vueuse/core`, `validup`, `@validup/vue`; deps `@ebec/core` (the issue model). |
| [`@ilingo/docs`](../docs)                              | private | VitePress 1.x marketing + reference site. Deploys to GitHub Pages via `.github/workflows/docs.yml`. Never published to npm. |

## Package Dependency Layers

Each layer may only depend on layers below it. Declared in each package's `package.json` (`dependencies` + `peerDependencies`) — that is the authoritative graph; the diagram below is a summary.

```
Foundation:
  ilingo                 (deps: @ebec/core, pathtrace, smob)

Layer 1:
  @ilingo/fs             (deps: ilingo, locter, pathe, smob)
  @ilingo/vue            (peer: ilingo, vue, @vueuse/core)

Layer 1.5:
  @ilingo/validup        (deps: @ebec/core; peer: ilingo, validup)   # framework-agnostic

Layer 2:
  @ilingo/vuelidate      (peer: @ilingo/vue, ilingo, vue, @vueuse/core, @vuelidate/core)
  @ilingo/validup-vue    (deps: @ebec/core; peer: @ilingo/validup, @ilingo/vue, ilingo, vue, @vueuse/core, validup, @validup/vue)
```

Nx (`nx.json`) is configured so `build` depends on `^build`, which means workspace builds run in topological order automatically.

## README Logos

Every README — the root one, all six packages, and `docs/` — opens with a centred `<p align="center">` logo block, an `<h1 align="center">`, and a one-line bold tagline, following [tada5hi/validup@8aea10e](https://github.com/tada5hi/validup/commit/8aea10e103c985825ccf38ea1926d9e56b2907dc). The logos are one family: a **speech-bubble silhouette** — the shape of a message, which is what a catalog holds — filled with a per-package gradient and carrying a per-package white glyph, at `<pkg>/assets/logo.svg`.

The bubble replaced an earlier rounded-tile silhouette; `docs/src/public/logo.svg` (the VitePress nav logo **and** the site favicon) was redrawn to the same bubble in the same commit, so the site and the READMEs stay one mark. Keep that file in sync with `assets/logo.svg` — they are the same drawing, and only the root/core marks are allowed to be near-identical.

Glyph per package, all white on the gradient with `#FBBF24` as the single accent: three text lines (root), the same lines with the resolved one in amber (`ilingo`), a folder (`@ilingo/fs`), the Vue chevron (`@ilingo/vue`), check-plus-message rows (`@ilingo/vuelidate`), a single check (`@ilingo/validup`), chevron-plus-check (`@ilingo/validup-vue`), an open book (`docs/`). Glyphs are drawn directly in bubble-body coordinates (roughly x 56–200, y 62–170, centred on y≈116) — no nested `transform`, so the numbers in the file are the numbers on screen.

**Package READMEs reference the logo by absolute `https://raw.githubusercontent.com/tada5hi/ilingo/HEAD/packages/<pkg>/assets/logo.svg` URL**, not a relative path — a relative `src` resolves against `npmjs.com` and 404s there. Each publishable package therefore lists `assets` in its `package.json` `files` array so the SVG ships in the tarball. The root and `docs/` READMEs are GitHub-only, so they use `./assets/logo.svg`.

## Per-Package Directory Layout

Each package co-locates its source, tests and logo. Core lookup and catalog normalization live in `packages/ilingo`; filesystem I/O stays in `packages/fs`; Vue provide/inject and composables stay in `packages/vue`. Validation adapters consume the public core contract. Read the detailed package layouts before moving a module. See [package layouts](topics/package-layouts.md).

## Package Exports

All six publishable packages use ESM (`"type": "module"`) and ship type declarations alongside `.mjs` bundles in `dist/`.

| Package             | Subpath exports                                |
|---------------------|------------------------------------------------|
| `ilingo`            | `.`                                            |
| `@ilingo/fs`        | `.`, `./core`                                  |
| `@ilingo/vue`       | `.`, `./core`                                  |
| `@ilingo/vuelidate` | `.`, `./store/memory`, `./store/loader`, `./core`, `./vue` |
| `@ilingo/validup`   | `.`, `./store/memory`, `./store/loader`        |
| `@ilingo/validup-vue` | `.`                                          |

The public API is whatever the package's `src/index.ts` re-exports. Anything not re-exported from there should be considered internal even if a subpath import would technically reach it.

### `docs/` — VitePress site (private)

```
docs/
├── package.json              # @ilingo/docs, private. scripts: dev / build / preview (vitepress src)
├── tsconfig.json
├── assets/logo.svg           # README logo (GitHub-only — the site's own mark is src/public/logo.svg)
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
- **`@ilingo/vue`** owns Vue integration: provide/inject of the `Ilingo` instance, reactive locale, component, composable, and the synchronous `computedAsync` seeding that keeps SSR markup and hydration in sync.
- **`@ilingo/vuelidate`** owns the Vuelidate use case: an eager `createMemoryStore()` and a lazy `createLoaderStore()` (both keyed by `STORE_ID`) pre-populated with validator-message translations, plus the composables that wire Vuelidate's `$errors` shape into ilingo.
- **`@ilingo/docs`** owns the marketing and reference site. Imports the public APIs only — never reaches into a package's `src/`. Free to depend on any published `ilingo` package via workspace symlink.
