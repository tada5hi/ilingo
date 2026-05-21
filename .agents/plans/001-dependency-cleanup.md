# Phase 1 — Post-modernization dependency cleanup

**Status**: Done.
**Blocks**: every later phase (work on a clean lockfile, not a stale one).

The modernization commit (`d77ef22 chore: modernize build pipeline and tooling`) removed several dev-dependency families (rollup + plugins, swc, jest, `@vitejs/plugin-vue` at root, `workspaces-publish`, `@tada5hi/eslint-config-vue-typescript`). Most of the 13 open dependabot PRs (#838–#894) were filed against the old graph and either no longer apply or have been transitively superseded by the new `package-lock.json`. The push warning ("39 vulnerabilities") counts historical alerts, of which only **2 remain non-fixed** today (both `auto_dismissed`, transitive) — so the security posture is already good.

## Scope

1. **Triage open dependabot PRs against the new lockfile.** For each of #838, #845, #860, #869, #884, #887, #888, #889, #890, #891, #892, #893, #894:
   - If the package is no longer in the tree (`rollup` #884, the eslint v9 PR #869) — close as `not planned` with a comment referencing `d77ef22`.
   - If the package is still present but the bump is already applied transitively — close.
   - If a genuinely-newer version is still wanted — let dependabot rebase or open a fresh PR against `master`.
2. **Resolve the lingering `FSStore.set` TODO** at `packages/fs/src/module.ts:53` (`// todo: write to file!`). Today `FSStore.set` delegates to `MemoryStore.set` and never persists to disk; the comment is the only signal that this is intentional. Either:
   - Implement file writing (write the touched group back to its source file, format inferred from the loaded extension); **or**
   - Remove the comment and document the read-only contract in the package README + the `IStore` JSDoc.
3. **Decide on a baseline `engines.node`.** Currently `>=22.0.0` repo-wide. Pin it in CI (`PRIMARY_NODE_VERSION: 24`) — consider adding a matrix that also exercises 22 to catch accidental Node-24-only API usage.
4. **Enable Dependabot grouping for the new toolchain.** Update `.github/dependabot.yml` so `tsdown`, `unplugin-vue`, `eslint`, `typescript-eslint`, `vitest`, `vue-tsc` bumps land as grouped PRs instead of one per package.

## Files touched

- GitHub UI only for the PR triage step.
- `packages/fs/src/module.ts` (and possibly its `README.md` / source comments) for the TODO.
- `.github/workflows/main.yml` for the optional Node matrix.
- `.github/dependabot.yml` for grouping.

## Acceptance

- [x] All 13 open dependabot PRs closed via `@dependabot close` comments — each carried the message that the installed version already meets/exceeds the bump after `d77ef22`.
- [x] `FSStore.set` now persists to JSON via atomic write-temp-then-rename; new `writeDirectory` option separates write target from read paths. Five new tests cover the round-trip, sibling preservation, nested keys, and the split read/write directory case. README updated.
- [x] Only 2 non-`fixed` Dependabot alerts on the repo before this phase started, both `auto_dismissed`. Re-run `npm audit --omit=dev` if a new advisory appears.
- [x] Dependabot config groups the new toolchain (`tsdown`, `unplugin-vue`, `vitest`, `eslint`, `typescript-eslint`, `vue-tsc`, `typescript`, `@tada5hi/*`).
- [x] CI matrix now exercises Node 22 and 24.

## Why first

A clean lockfile baseline means later phases' PRs have small, reviewable dep diffs, and the test-vs-vulnerability signal isn't drowned by stale Dependabot noise.
