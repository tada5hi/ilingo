# Conventions

## Tooling

| Tool                                       | Purpose                                                                 |
|--------------------------------------------|-------------------------------------------------------------------------|
| npm workspaces                             | Monorepo package management                                             |
| Nx (`nx.json`)                             | Task orchestration + caching for `build`, `lint`, `test`                |
| TypeScript 6                               | Source language; `@tada5hi/tsconfig` is the base config                 |
| tsdown                                     | JS bundling — Rolldown (Rust) + Oxc, emits a single ESM `.mjs` per package |
| `unplugin-vue/rolldown`                    | Vue SFC compilation inside tsdown (only `@ilingo/vue` uses it)          |
| `vue-tsc`                                  | `.d.ts` emission for Vue packages (`@ilingo/vue`, `@ilingo/vuelidate`) — tsdown's dts pipeline does not understand `.vue` |
| Vitest 4                                   | Test runner; config lives in `packages/<pkg>/test/vitest.config.ts`     |
| ESLint 10 (flat config)                    | Linting via `@tada5hi/eslint-config({ typescript: true, vue: true })`   |
| Husky + commitlint                         | Pre-commit hook validating Conventional Commits                         |
| release-please                             | Automated changelogs + version bumps from commit history                |
| `tada5hi/monoship@v2`                      | Publishes workspace packages whose `version` is not yet on the registry; OIDC trusted publishing |

## Workflow

- After source changes, run `npm run lint` (top-level) and `npm run build` (top-level or `--workspace=packages/<pkg>`) before declaring a task done.
- **Keep docs in sync with code — every layer, every commit.** Any change that touches an observable surface (new public API, behavior change, new config field, new file in `src/`, new test spec) updates **all three** doc layers in the *same* commit. Shipping a public surface that's documented in only one layer is a real review-blocking gap, not a follow-up.
  1. **Package READMEs** (`packages/<pkg>/README.md`) — GitHub landing page. Update for any new public symbol or contract change in that package.
  2. **VitePress docs** (`docs/src/guide/*.md` for conceptual / cross-package material; `docs/src/integrations/*.md` for per-integration usage — Vue, fs, Vuelidate). The canonical published reference at the docs site. Cross-link guide ↔ integration pages where it helps the reader.
  3. **Agent docs** — `.agents/architecture.md` (orchestration / data-flow / patterns), `.agents/structure.md` (file tree), `.agents/testing.md` (new specs), this file (new conventions or tooling).

  Plan files in `.agents/plans/` flip status Ready → In review → Done as the work moves through PRs.

  **Verification step before declaring done**: for every new public symbol exported from `src/index.ts`, grep both `packages/*/README.md` AND `docs/src/**/*.md`. Both must reference it. If they don't, the work isn't done.

  Exceptions: pure internal refactors with no observable change, and one-line bug fixes that don't change semantics. Use judgment.
- When adding a new public symbol, re-export it from the package's `src/index.ts` — that file is the public-API contract.
- When changing an `IStore` method signature, update both adapters (`MemoryStore`, `FSStore`) in the same commit; they share the port interface.
- When adding a new package, register it in `release-please-config.json` and in the root `README.md` package list. monoship will publish it on the next release if its `version` is not on the registry.

## Code Style

- **Module format**: ESM only — every package declares `"type": "module"`. No CJS sources.
- **Indentation**: 4 spaces (per `.editorconfig`).
- **Line endings**: LF.
- **Charset**: UTF-8, final newline required, trailing whitespace trimmed (except in `.md`).
- **Linting**: `eslint.config.js` is the single source of truth — flat config, no per-package overrides today. It invokes the `@tada5hi/eslint-config` factory with `typescript: true, vue: true`, then ignores `**/dist/**`, `**/node_modules/**`, `**/playground/**`, `**/test/**`, `**/*.d.ts`.

## File Header Convention

Every source file starts with a short copyright block:

```typescript
/*
 * Copyright (c) <year>.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */
```

When creating new files, copy this header and use the **current year**.

## Naming Conventions

| Pattern                  | Example                                | Notes                                                                 |
|--------------------------|----------------------------------------|-----------------------------------------------------------------------|
| Port interfaces          | `IStore`                               | `I`-prefix used (see commit `137dfd5 fix: rename interface Store -> IStore`) |
| Adapter classes          | `MemoryStore`, `FSStore`               | No `Adapter` suffix; descriptive concrete name                        |
| Context types            | `StoreGetContext`, `GetContext`, `GetContextReactive` | Object passed to async methods — group + key + optional locale/data |
| Config types             | `Config` + `ConfigInput`               | `packages/ilingo`: both names alias the same fully-optional shape (every field has a runtime default, so the split was misleading). `packages/fs`: `Config` is the resolved shape and `ConfigInput` is the un-normalized input (`directory: string \| string[]`) — keep the split when the input shape differs from the resolved shape. |
| Options types            | `MemoryStoreOptions`, vue `Options`    | Constructor / install argument shapes                                 |
| Lines records            | `LinesRecord`, `GroupsRecord`, `LocalesRecord` | Plural-noun + `Record` — the nested data shape                  |
| File names               | `kebab-case.ts`                        | `use-translation.ts`, `has-own-property.ts`                            |

## File Organization

- Exported types live in `types.ts` colocated with the implementation (e.g. `src/store/types.ts`, `src/config/type.ts` — note the inconsistent singular/plural; mirror the surrounding directory rather than introducing a new convention).
- Each directory has an `index.ts` barrel re-exporting from `types.ts` and the implementation files.
- The package's `src/index.ts` re-exports the public API — anything not re-exported there is internal.
- Static data (e.g. BCP-47 codes) lives in JSON next to the consumer (`packages/ilingo/src/utils/language/data.json`); tsdown inlines it at build time via `resolveJsonModule: true`.

## Pre-commit Hooks

Husky runs on every commit (`.husky/commit-msg`):

1. **commitlint** (`@tada5hi/commitlint-config`, ESM config at `commitlint.config.mjs`) — validates the message follows Conventional Commits.

`prepare: husky` in the root `package.json` installs the hook directory on `npm install`. There is no `pre-commit` lint-staged hook wired up today — run `npm run lint` manually.

## Commit Convention

Conventional Commits, validated by commitlint:

```
<type>(<scope>): <description>

<optional body>

<optional footer>
```

- Recent example types in this repo: `feat`, `fix`, `chore`, `build`, `refactor`.
- Scopes are optional; when used they reference a package or area (e.g. `build(deps-dev): ...`).
- release-please reads the history to pick the next version per workspace, so a wrong type or missing exclamation mark on a breaking change will produce a wrong release.
- **Do not** add `Co-Authored-By: Claude ...` trailers (see `AGENTS.md` → Commits).

## TypeScript

- Base: `@tada5hi/tsconfig` (strict settings). The root `tsconfig.json` extends it and overrides `module`/`moduleResolution` to `ESNext`/`bundler`, sets `noEmit: true` and `allowImportingTsExtensions: true`. tsc is used for type-checking only — tsdown handles emission.
- `target: ES2022`, `module: ESNext`, `moduleResolution: bundler`, `lib: ["ESNext"]` (Vue packages add `"DOM", "DOM.Iterable"`).
- `strict: false` repo-wide — do not turn on strictness as a side effect of other work; treat it as a separate migration if attempted.
- Each Vue package keeps a `tsconfig.build.json` (`emitDeclarationOnly: true`, `outDir: dist`) consumed exclusively by `vue-tsc` to produce `.d.ts` for `.vue` SFCs. Non-Vue packages need no `tsconfig.build.json` — tsdown handles their `.d.mts`.

## Build Output

- One `dist/` per package, gitignored.
- `dist/index.mjs` — single ES-module bundle produced by tsdown.
- `dist/index.d.mts` (non-Vue packages) or `dist/index.d.ts` (Vue packages, via `vue-tsc`).
- Source maps are emitted (`sourcemap: true` in `tsdown.config.ts`).
- The `files` field in each `package.json` controls what is published — `dist/` plus any pre-built subpath dirs (`core/`, `vue/`).

### Tree-shaking — `sideEffects: false`

Every published package declares `"sideEffects": false` in its `package.json` so Vite / webpack / Rollup can drop unused exports from a consumer's bundle. The audit that backed this (#917 Track E) confirmed no top-level side effects in any `src/` file: no module-scope `console.*`, no global mutations, no prototype patching, no CSS imports, no bare effectful imports. The single Vue SFC (`@ilingo/vue/src/component.vue`) has no `<style>` block.

When adding new source files, keep this contract:

- **OK**: function/class declarations, constants, JSON imports as values, lazy-imports inside function bodies (e.g. `FSStore`'s lazy `chokidar` import).
- **Not OK without flipping the field**: top-level statements that run on import (registering globals, mutating prototypes, side-effect-only imports like `import 'some-polyfill'`, CSS imports). If you genuinely need any of these, change the package's `sideEffects` to a path-list (`["**/*.vue", "**/*.css"]`) rather than dropping the optimisation entirely.

### Bundle size — `size-limit` budgets

`.size-limit.json` at the repo root holds a budget per published-package entry — the full barrel for each, plus a couple of typical-slice imports for `ilingo` that validate tree-shaking. CI runs `npm run size` after the build; the job fails if any entry exceeds its limit. Current numbers (brotli, gzipped):

| Entry | Budget | Current |
|---|---|---|
| `ilingo` — full barrel | 6 kB | 5.38 kB |
| `ilingo` — `Ilingo + MemoryStore` | 5 kB | 3.33 kB |
| `ilingo` — `defineCatalog` only | 1.3 kB | 1.18 kB |
| `ilingo` — `negotiateLocale + parseAcceptLanguage` | 1.7 kB | 1.55 kB |
| `@ilingo/fs` — full barrel | 4 kB | 3.00 kB |
| `@ilingo/vue` — full barrel | 2 kB | 1.74 kB |
| `@ilingo/vuelidate` — full barrel | 2.5 kB | 1.96 kB |

`@ilingo/fs`'s entry ignores `node:*` modules and the optional `chokidar` peer (server-only package — those aren't consumer-bundled). `@ilingo/vue` and `@ilingo/vuelidate` ignore their declared peers (`vue`, `ilingo`, etc.).

A consequence of `smob` and `pathtrace` not declaring `sideEffects: false` themselves: any single-symbol import from `ilingo` carries a ~1.2 kB floor from those upstream deps. That's why `defineCatalog` alone weighs 1.18 kB — it's not the function (it's an identity); it's the deps that come along. If we ever upstream `sideEffects: false` to those packages (or replace them with first-party code), the tree-shake floor drops further.

Same ratchet rule as coverage thresholds: tighten budgets in the same PR that improves a number; never loosen one to keep CI green — investigate the regression first.

## Release Process

- **release-please** (`.github/workflows/release.yml`) reads Conventional Commits since the last release tag and opens a PR that bumps versions and updates `CHANGELOG.md` per workspace.
- `release-please-config.json` lists the four components (`ilingo`, `fs`, `vue`, `vuelidate`) and uses the `node-workspace` plugin so internal version ranges are kept in sync (`updatePeerDependencies: true`).
- Merging the release-please PR triggers the rest of the `release.yml` job: install → build → `tada5hi/monoship@v2`. monoship checks each workspace's `version` against the npm registry and publishes only the ones that aren't there yet.
- **OIDC trusted publishing** is enabled via `permissions: id-token: write`. No `NPM_TOKEN` secret is configured or needed — npm 10+ negotiates a short-lived token with the registry.

## CI/CD

- `.github/workflows/main.yml` — jobs: `install → build → {lint, tests}`. Composite actions `./.github/actions/install` (caches `node_modules` keyed on `package-lock.json`) and `./.github/actions/build` (caches `**/dist/**` keyed on `github.sha`).
- `.github/workflows/release.yml` — release-please + monoship as above.
- Primary Node version: 24 (matrices may be added later; `engines.node` is `>=22.0.0`).
- Dependabot is configured (`.github/dependabot.yml`); minor + patch updates are grouped.

## Architecture Conventions

- A new translation source = a new class implementing `IStore`, not a fork of `Ilingo`. The orchestrator is intentionally tiny.
- Vue and Vuelidate are **peer dependencies**, never bundled — never add them to a package's `dependencies`.
- `@ilingo/vue` is the integration seam: any other Vue-aware adapter should depend on it and re-use `applyInstallInput` rather than re-implementing the provide/inject dance (see how `@ilingo/vuelidate/src/index.ts` chains it).
- The `docs/` site (`@ilingo/docs`) consumes packages only through their **public exports** — never reach into `packages/*/src/`. The workspace symlink resolves the package name at build time. The site is private (`"private": true`) and excluded from `release-please-config.json`.

## Best Practices

- Use ESM and modern TypeScript only.
- Before adding new code, read the analogous file in a sibling package — patterns (Config + ConfigInput pair, `src/index.ts` barrel, `test/data/language/...` fixtures) repeat across packages and should stay aligned.
- Keep runtime dependencies minimal; prefer peer deps for framework integrations.
- Maintain consistency with existing conventions; if you feel a pattern is wrong, propose the change separately rather than mixing it into an unrelated commit.
