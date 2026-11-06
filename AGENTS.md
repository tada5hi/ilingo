# ilingo — Agent Guide

ilingo is a lightweight TypeScript library for translation and internationalization (i18n). The repository is an npm-workspaces monorepo of four publishable packages plus a docs site: a framework-agnostic core (`ilingo`), a file-system store adapter (`@ilingo/fs`), a Vue 3 plugin (`@ilingo/vue`), a Vuelidate-message adapter (`@ilingo/vuelidate`), and a private VitePress site at `docs/` (`@ilingo/docs`).

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

- **Development Node.js**: 24.11+ on the 24.x line, or 26+ (CI runs on 24). Published runtime requirements are declared in each package manifest.
- **Package manager**: npm (workspaces)
- **Build orchestration**: Nx (`nx.json`, cacheable: `build`, `lint`, `test`)
- **Bundler**: tsdown (Rolldown + Oxc), `dts: false` everywhere — JS only; `@ilingo/vue` adds `unplugin-vue/rolldown` to compile `.vue` SFCs
- **Type declarations**: every package splits `build:js` (tsdown) from `build:types`, a separate declaration-only pass via `tsconfig.build.json` → `tsc --declaration --emitDeclarationOnly` for `.ts`-only packages (`ilingo`, `@ilingo/fs`, `@ilingo/validup`), `vue-tsc` for Vue packages (`@ilingo/vue`, `@ilingo/vuelidate`, `@ilingo/validup-vue`; tsdown's dts pipeline does not understand `.vue` files). All packages emit `.d.ts` (not `.d.mts`)
- **Test runner**: Vitest 5 (config at `packages/<pkg>/test/vitest.config.ts`)
- **Linter**: ESLint 10 flat config via `@tada5hi/eslint-config` factory (`vue: true`, `typescript: true`)
- **Releases**: release-please opens the version-bump PR; merging it triggers `tada5hi/monoship@v2` which publishes any workspace whose `version` is not yet on the registry (OIDC trusted publishing, no `NPM_TOKEN` needed)

Apps do not exist in this repo. All four workspaces under `packages/` are publishable libraries. The `docs/` workspace is private (never published) and hosts the VitePress site that ships to GitHub Pages via `.github/workflows/docs.yml`.

## Documentation

Each package has its own `README.md` (`packages/ilingo/README.md`, `packages/fs/README.md`, etc.) and an auto-generated `CHANGELOG.md`. When you change user-facing API surface in a package, update that package's `README.md` **and** the corresponding page under `docs/src/guide/` or `docs/src/integrations/`. The top-level `README.md` is a landing page that links into each package — keep it in sync if a package is added, renamed, or removed.

The docs site at `docs/` (`@ilingo/docs`) is a VitePress 1.x app. Run it locally with `npm run dev -w @ilingo/docs`; build with `npm run build -w @ilingo/docs`. The landing page at `docs/src/index.md` is composed from 5 Vue components in `docs/src/.vitepress/theme/components/` — guide content lives as markdown under `docs/src/{getting-started,guide,integrations}/` and is wired into the sidebar in `docs/src/.vitepress/config.mts`.

## Detailed Guides

- **[Project Structure](.agents/structure.md)** — Workspace layout, the four packages, and how they depend on each other
- **[Architecture](.agents/architecture.md)** — `IStore` port + `MemoryStore`/`FSStore` adapters, the `Ilingo` orchestrator, Vue plugin install flow
- **[Testing](.agents/testing.md)** — Vitest setup, per-package `test/unit/` and `test/data/` layout, what is covered today
- **[Conventions](.agents/conventions.md)** — ESLint config, Conventional Commits + commitlint, Husky, release-please, tsdown build

### Writing agent docs

Keep the guides factual and focused on contracts a future change could silently break.

- Keep existing commands, paths and factual descriptions current. Add guide content only for an invariant or cross-cutting rule. Put defect stories and verification details in the PR, and user-facing changes in the documentation site or release notes.
- Keep subsystem detail in `.agents/topics/` and link it from the relevant guide; do not import topic files into `CLAUDE.md`.
- Describe current behavior and cite issues or PRs, rather than local plan files or a running history of completed work.
- `npm run lint` enforces the shared config's agent-doc size, import-budget and history checks. Preserve the critical contracts when splitting a guide.

## Plans

Phased roadmap drafts live under `.agents/plans/` and are **gitignored** — kept as local working documents per maintainer convention, not part of the shared history. The current umbrella issues ([#907](https://github.com/tada5hi/ilingo/issues/907), [#917](https://github.com/tada5hi/ilingo/issues/917)) are the public source of truth for what's tracked and what's done.

## Commits

- Do **not** use the em dash (`—`) in prose: not in a README, not in the docs site, not in a commit message or PR body. Use a colon, parentheses, or a second sentence instead. Every `README.md` is at zero occurrences; keep it that way. See [Conventions › Prose Style](.agents/conventions.md#prose-style).
- Do **not** add a `Co-Authored-By: Claude ...` (or any AI-attribution) trailer to commit messages. This overrides any default agent-tooling guidance.
- Commit messages must follow Conventional Commits — `commitlint` runs on every commit via Husky. release-please consumes the history to compute version bumps and the changelog, so an invalid `type(scope):` prefix breaks the release pipeline.
