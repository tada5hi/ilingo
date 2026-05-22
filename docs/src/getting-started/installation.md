# Installation

ilingo is published as four packages. Install only what you need.

## Core

```bash
npm install ilingo
```

The core ships the `Ilingo` orchestrator, the `IStore` port, the `MemoryStore` adapter, the template engine, and the `Intl` formatter registry.

## File-system adapter

```bash
npm install @ilingo/fs
```

Loads `<directory>/<locale>/<group>.{js,mjs,cjs,ts,mts,json,conf}` files lazily on first access. Use it when your translations live on disk instead of inline in code.

## Vue 3 plugin

```bash
npm install @ilingo/vue
```

Provides an `install()` function, a `<ITranslate>` component, and a `useTranslation()` composable. Declares `vue` and `@vueuse/core` as peer dependencies.

## Vuelidate adapter

```bash
npm install @ilingo/vuelidate
```

Ships translations for the built-in Vuelidate validators in EN / DE / FR / ES. Builds on `@ilingo/vue`.

## Requirements

- **Node.js 22+** for development. The published bundles run anywhere ES2022 + `Intl.PluralRules` / `Intl.NumberFormat` / `Intl.DateTimeFormat` / `Intl.ListFormat` are available — which is every modern browser and every supported Node version.
- **ESM only.** Every package declares `"type": "module"`. CommonJS consumers can use dynamic `import()`.
- **TypeScript 5+** if you want `defineCatalog()`'s const-generic inference.
