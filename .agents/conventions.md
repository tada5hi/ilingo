# Conventions

## Tooling

| Tool                                       | Purpose                                                                 |
|--------------------------------------------|-------------------------------------------------------------------------|
| npm workspaces                             | Monorepo package management                                             |
| Nx (`nx.json`)                             | Task orchestration + caching for `build`, `lint`, `test`                |
| TypeScript 5.9                             | Source language; `@tada5hi/tsconfig` is the base config                 |
| Rollup + `unplugin-swc`                    | JS bundling — emits a single `.mjs` per package                         |
| `@vitejs/plugin-vue` (in Rollup)           | Single-file `.vue` component compilation                                |
| `vue-tsc`                                  | `.d.ts` emission for Vue packages (`@ilingo/vue`, `@ilingo/vuelidate`)  |
| `tsc --emitDeclarationOnly`                | `.d.ts` emission for non-Vue packages                                   |
| Vitest 4                                   | Test runner                                                             |
| ESLint 8 (`@tada5hi/eslint-config-vue-typescript`) | Linting                                                         |
| Husky + commitlint                         | Pre-commit hook validating Conventional Commits                         |
| release-please                             | Automated changelogs + version bumps from commit history                |

## Workflow

- After source changes, run `npm run lint` (top-level) and `npm run build` for the affected workspace before declaring a task done.
- When adding a new public symbol, re-export it from the package's `src/index.ts` — that file is the public-API contract.
- When changing an `IStore` method signature, update both adapters (`MemoryStore`, `FSStore`) in the same commit; they share the port interface.
- When adding a new package, register it in `release-please-config.json` and in the root `README.md` package list.

## Code Style

- **Module format**: ESM only — every package declares `"type": "module"`. No CJS sources.
- **Indentation**: 4 spaces (per `.editorconfig`).
- **Line endings**: LF.
- **Charset**: UTF-8, final newline required, trailing whitespace trimmed (except in `.md`).
- **Linting**: extends `@tada5hi/eslint-config-vue-typescript`. Project-level overrides (`/.eslintrc`):
  - `class-methods-use-this: off` (stores keep `async` methods even when they could be static)
  - `import/no-cycle` enforced at `maxDepth: 1`
  - `no-shadow`, `no-use-before-define`, `no-underscore-dangle` disabled
  - `@typescript-eslint/no-unused-vars` disabled
  - `**/test/*` is excluded from linting

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
| Config types             | `Config` (required) + `ConfigInput` (Partial) | The pair appears in both `packages/ilingo/src/config/` and `packages/fs/src/types.ts` — replicate it for new packages with constructor options |
| Options types            | `MemoryStoreOptions`, vue `Options`    | Constructor / install argument shapes                                 |
| Lines records            | `LinesRecord`, `GroupsRecord`, `LocalesRecord` | Plural-noun + `Record` — the nested data shape                  |
| File names               | `kebab-case.ts`                        | `use-translation.ts`, `has-own-property.ts`                            |

## File Organization

- Exported types live in `types.ts` colocated with the implementation (e.g. `src/store/types.ts`, `src/config/type.ts` — note the inconsistent singular/plural; mirror the surrounding directory rather than introducing a new convention).
- Each directory has an `index.ts` barrel re-exporting from `types.ts` and the implementation files.
- The package's `src/index.ts` re-exports the public API — anything not re-exported there is internal.
- Static data (e.g. BCP-47 codes) lives in JSON next to the consumer (`packages/ilingo/src/utils/language/data.json`); `@rollup/plugin-json` inlines it at build time.

## Pre-commit Hooks

Husky runs on every commit (`.husky/commit-msg`):

1. **commitlint** (`@tada5hi/commitlint-config`) — validates the message follows Conventional Commits.

There is **no `pre-commit` lint-staged hook** wired up today even though `lint-staged` is in `devDependencies`. Run `npm run lint` manually.

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

- Base: `@tada5hi/tsconfig` extended by `tsconfig.build.json`.
- `target: ES2022`, `module: ESNext`, `moduleResolution: bundler`, `lib: ["ESNext"]`.
- `strict: false` repo-wide — do not turn on strictness as a side effect of other work; treat it as a separate migration if attempted.
- `tsconfig.json` (root) sets `noEmit: true` and is used for editor / lint only.
- Each package has its own `tsconfig.build.json` that emits declarations.

## Build Output

- One `dist/` per package, gitignored.
- `dist/index.mjs` — single ES-module bundle produced by Rollup.
- `dist/index.d.ts` — declarations from `tsc`/`vue-tsc`.
- Source maps are emitted (`sourcemap: true` in `rollup.config.mjs`).
- The `files` field in each `package.json` controls what is published — `dist/` (and `core/` / `vue/` for the adapters with subpath exports).

## Release Process

- **release-please** (`.github/workflows/release.yml`) reads Conventional Commits since the last release tag and opens a PR that bumps versions and updates `CHANGELOG.md` per workspace.
- `release-please-config.json` lists the four components (`ilingo`, `fs`, `vue`, `vuelidate`) and uses the `node-workspace` plugin so internal version ranges are kept in sync (`updatePeerDependencies: true`).
- `prerelease: true` + `bump-minor-pre-major: true` — while `0.x`-style or pre-1.0 series are in play, breaking changes bump minor; today the published packages are already past 1.0 so this affects future zero-versioned packages.
- Merging the release-please PR triggers publishing (the `release` script in `packages/ilingo/package.json` is manual; CI handles workspace publishes via `workspaces-publish`).

## CI/CD

- `.github/workflows/main.yml` — runs lint/build/test on push and PR.
- `.github/workflows/release.yml` — runs release-please and publishes.
- Dependabot is configured (`.github/dependabot.yml`); minor + patch updates are grouped (see recent commit `402f49e build(deps-dev): bump the minorandpatch group with 11 updates`).

## Architecture Conventions

- A new translation source = a new class implementing `IStore`, not a fork of `Ilingo`. The orchestrator is intentionally tiny.
- Vue and Vuelidate are **peer dependencies**, never bundled — never add them to a package's `dependencies`.
- `@ilingo/vue` is the integration seam: any other Vue-aware adapter should depend on it and re-use `applyInstallInput` rather than re-implementing the provide/inject dance (see how `@ilingo/vuelidate/src/index.ts` chains it).

## Best Practices

- Use ESM and modern TypeScript only.
- Before adding new code, read the analogous file in a sibling package — patterns (Config + ConfigInput pair, `src/index.ts` barrel, `test/data/language/...` fixtures) repeat across packages and should stay aligned.
- Keep runtime dependencies minimal; prefer peer deps for framework integrations.
- Maintain consistency with existing conventions; if you feel a pattern is wrong, propose the change separately rather than mixing it into an unrelated commit.
