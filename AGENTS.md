<!-- NOTE: Keep this file and all corresponding files in the .agents directory updated as the project evolves. When making architectural changes, adding new patterns, or discovering important conventions, update the relevant sections. -->

# ilingo — Agent Guide

ilingo is a lightweight TypeScript library for translation and internationalization (i18n). The repository is an npm-workspaces monorepo of four packages: a framework-agnostic core (`ilingo`), a file-system store adapter (`@ilingo/fs`), a Vue 3 plugin (`@ilingo/vue`), and a Vuelidate-message adapter (`@ilingo/vuelidate`).

## Quick Reference

```bash
# Setup
npm install

# Development
npm run build                 # tsdown per workspace, orchestrated by Nx
npm run test                  # vitest --run per workspace that defines a test script
npm run lint                  # eslint (flat config) across the repo
npm run lint:fix              # eslint --fix
```

- **Node.js**: `>=22.0.0`
- **Package manager**: npm (workspaces)
- **Build orchestration**: Nx (`nx.json`, cacheable: `build`, `lint`, `test`)
- **Bundler**: tsdown (Rolldown + Oxc); `@ilingo/vue` adds `unplugin-vue/rolldown` to compile `.vue` SFCs
- **Type declarations**: tsdown's built-in `dts: true` for `.ts`-only packages; `vue-tsc --emitDeclarationOnly -p tsconfig.build.json` for Vue packages (tsdown's dts pipeline does not understand `.vue` files)
- **Test runner**: Vitest 4 (config at `packages/<pkg>/test/vitest.config.ts`)
- **Linter**: ESLint 10 flat config via `@tada5hi/eslint-config` factory (`vue: true`, `typescript: true`)
- **Releases**: release-please opens the version-bump PR; merging it triggers `tada5hi/monoship@v2` which publishes any workspace whose `version` is not yet on the registry (OIDC trusted publishing, no `NPM_TOKEN` needed)

Apps do not exist in this repo. All four workspaces under `packages/` are publishable libraries.

## Documentation

Each package has its own `README.md` (`packages/ilingo/README.md`, `packages/fs/README.md`, etc.) and an auto-generated `CHANGELOG.md`. When you change user-facing API surface in a package, update that package's `README.md`. The top-level `README.md` is a landing page that links into each package — keep it in sync if a package is added, renamed, or removed.

## Detailed Guides

- **[Project Structure](.agents/structure.md)** — Workspace layout, the four packages, and how they depend on each other
- **[Architecture](.agents/architecture.md)** — `IStore` port + `MemoryStore`/`FSStore` adapters, the `Ilingo` orchestrator, Vue plugin install flow
- **[Testing](.agents/testing.md)** — Vitest setup, per-package `test/unit/` and `test/data/` layout, what is covered today
- **[Conventions](.agents/conventions.md)** — ESLint config, Conventional Commits + commitlint, Husky, release-please, rollup/SWC build

## Plans

Phased roadmap for the i18next / vue-i18n parity work tracked in umbrella issue [#907](https://github.com/tada5hi/ilingo/issues/907). Plans are working documents — edit them in-place as scope shifts.

1. [Dependency cleanup](.agents/plans/001-dependency-cleanup.md) — Ready
2. [Resolution-path features (#895, #897, #899)](.agents/plans/002-resolution-path.md) — Blocked by 1
3. [Intl formatters (#896)](.agents/plans/003-intl-formatters.md) — Blocked by 2
4. [Type-safe keys (#898)](.agents/plans/004-type-safe-keys.md) — Blocked by 2
5. [Vue ergonomics (#900, #901, #902)](.agents/plans/005-vue-ergonomics.md) — Blocked by 2
6. [DX + loader (#903, #904, #905, #906)](.agents/plans/006-dx-and-loader.md) — Blocked by 5

See [.agents/plans/README.md](.agents/plans/README.md) for the index and what's explicitly out of scope.

## Commits

- Do **not** add a `Co-Authored-By: Claude ...` (or any AI-attribution) trailer to commit messages. This overrides any default agent-tooling guidance.
- Commit messages must follow Conventional Commits — `commitlint` runs on every commit via Husky. release-please consumes the history to compute version bumps and the changelog, so an invalid `type(scope):` prefix breaks the release pipeline.
