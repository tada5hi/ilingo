# Testing

## Setup

- **Runner**: [Vitest](https://vitest.dev/) (v4)
- **Test location**: `packages/<pkg>/test/unit/**/*.spec.ts`
- **Fixtures**: `packages/<pkg>/test/data/` — real locale files loaded at test time (no mocking of the filesystem)
- **Config**: `packages/<pkg>/test/vitest.config.ts` per package; the test script (`vitest --config test/vitest.config.ts --run`) sets `NODE_ENV=test` via `cross-env`. Coverage is configured but not enforced via thresholds.

`ilingo`, `@ilingo/fs` and `@ilingo/vue` have unit suites; `@ilingo/vuelidate` ships a `playground/` Vite app instead — manual verification through the playground is the convention there. The Vue suite additionally renders through **`@vue/server-renderer`** (`ssr.spec.ts`, declared devDep) because the SSR-first-render contract cannot be observed via `@vue/test-utils` `mount` alone: the bug class it guards (#988) only appears when markup is produced by `renderToString` and then hydrated.

## Running Tests

```bash
npm run test                                            # runs vitest in every workspace that has a test script (via Nx)
npm run test --workspace=packages/ilingo                # single workspace
npm run test --workspace=packages/fs
cross-env NODE_ENV=test npx vitest run test/unit/module.spec.ts   # single file (from inside the workspace)
npm run test:coverage --workspace=packages/ilingo       # vitest --coverage
```

Nx caches `test` (see `nx.json` → `cacheableOperations`). To re-run an already-green workspace, clear with `npx nx reset`.

## Test Layout

Core specs cover locale order, serial store fallback, identity/deduplication, sync availability, plural nodes, formatter scope and invalidation. Adapter specs cover their I/O and framework boundaries. Read the detailed layout when adding a fixture or selecting a focused suite. See [test layouts](topics/test-layouts.md).

## Test Helpers & Fixtures

- `MemoryStore` ingests the descriptor tree (`CatalogInput`), so tests build catalogs **inline with the `define*` helpers** — there is no shared `toCatalog` legacy-shape helper anymore (it was removed along with its `@plural` marker support; author plurals with `definePlural(...)`). Construct the tree directly:
  ```typescript
  const ilingo = new Ilingo({
      store: new MemoryStore({
          data: defineCatalog([
              defineLocale('en', [
                  defineNamespace('app', [defineTranslations({ hi: 'Hello' })]),
              ]),
          ]),
      }),
  });
  ```
- `test/data/language/<locale>/<namespace>.{ts,js,json,cjs}` are translations nodes and double as both a fixture and a smoke test of `FSStore`'s loader extension matrix.

## Testing Philosophy

Tests assert the **public contract** of `Ilingo` and the stores — the things documented in `architecture.md`: locale-first walk with fallback chain, serial intra-locale store walk (stop at first hit), plural selection via `Intl.PluralRules`, missing-key handler routing, `{{var}}` substitution, `merge()` deduping by reference identity. If a test fails after a refactor, treat it as a real regression on that contract until proven otherwise.

The sync read path carries one extra contract worth its own assertion style: **`getSync(ctx)` must equal `await get(ctx)` whenever it isn't `undefined`.** `sync.spec.ts` asserts that by comparing the two calls over a table of contexts (interpolation, plural, fallback locale, nested key) rather than hardcoding expected strings — a divergence in either path then fails the test regardless of which one changed. Cover the bail-out cases the same way: an async-only store *before* the hit yields `undefined` (and must not run `onMissingKey`), while one *after* the hit must not change the answer.

For tests covering store call order (serial walk, fallthrough, debounce, etc.), assert the **invariant** (e.g. "later stores were not called when the first hit") with a recording fake — never wall-clock thresholds, which flake on CI scheduler jitter.

### Fakes Over Mocks

`MemoryStore` is itself the canonical fake for the `IStore` port — it implements the full interface with in-memory state. Use it directly instead of reaching for `vi.fn()` / `vi.mock()`:

```typescript
// Good — real implementation of the port, no mocking layer
// MemoryStore takes the descriptor tree, built inline with the define* helpers
const store = new MemoryStore({
    data: defineCatalog([
        defineLocale('en', [
            defineNamespace('app', [defineTranslations({ hi: 'Hello' })]),
        ]),
    ]),
});
const ilingo = new Ilingo({ store });

// Bad — opaque spy stubs, couple the test to internal call shapes
const store = { get: vi.fn(), set: vi.fn(), getLocales: vi.fn() };
```

For a custom `IStore` adapter under test, write a tiny class implementing `IStore` rather than stubbing methods on an object literal — the class form catches signature drift at compile time.

## Code Coverage

Each unit-tested package (`ilingo`, `@ilingo/fs`, `@ilingo/vue`) defines a `test:coverage` script that runs `vitest --coverage`. Provider is `v8`; the report includes `src/**/*.{ts,tsx,js,jsx,vue}` per package. Run the full suite from the repo root with `npm run test:coverage` (Nx orchestrates one workspace at a time and caches the results).

### Thresholds

Each `test/vitest.config.ts` carries a `coverage.thresholds` block. The floors are picked from the current baseline minus a few percentage points of headroom so routine churn doesn't fail CI:

| Package | Statements | Branches | Functions | Lines |
|---|---|---|---|---|
| `ilingo` | 90 | 80 | 85 | 90 |
| `@ilingo/fs` | 85 | 60 | 80 | 85 |
| `@ilingo/vue` | 75 | 65 | 75 | 75 |

`@ilingo/vuelidate` has no unit suite (playground only); skipped.

The `@ilingo/fs` branch floor is intentionally loose — FSStore has many optional code paths (`watch: true`, multi-directory, chokidar peer detection) that only fire under specific configs and are exercised by tests selectively. `@ilingo/vue` trails core because `<ITranslate>` is exercised through the playground rather than the unit suite, and reactive paths through `computedAsync` don't always fire in happy-dom.

CI runs `npm run test:coverage`, so threshold violations fail the build. Treat the thresholds as a ratchet — when sustained baseline moves above the floor, raise the floor in the same PR that benefits from it. Don't lower a threshold to keep CI green; investigate why the previous floor became hard to hit.

## Cross-runtime smoke

`packages/ilingo/test/smoke.mjs` is a runtime-agnostic script that loads the built `dist/index.mjs` exactly like a published consumer and exercises a representative API slice (construct → locale chain → fallback → plural → interpolation → missing-key → `getSync`, including a `getSync(ctx) === await get(ctx)` assertion and the `SyncUnavailableError` an async-only store throws, checked through the marker-based guard). It uses only the JS standard library (no `node:*` imports — a tiny inline `equal()` helper stands in for `assert.strictEqual`) so it runs unmodified under any ES2022 + ESM + Promise runtime: Node, Bun, Deno, modern browsers via `<script type="module">`, Cloudflare Workers, Vercel Edge.

CI runs it under **Node** and **Bun** via a matrix job in `.github/workflows/main.yml` (`oven-sh/setup-bun@v2` for the Bun runner). Other runtimes aren't gated in CI today, but because the script has no Node-specific dependencies, adding a runner is one matrix entry away.

`packages/ilingo/test/unit/utils/env.spec.ts` covers the `isProductionEnv()` guard (`typeof process !== 'undefined'` short-circuit + `try/catch` around `process.env` access) by simulating each runtime's globals inside vitest:

- Node prod / dev / unset → boolean correctness.
- `process` undefined (raw browser) → false, no throw.
- `process` present but `.env` missing (sparse polyfill) → false, no throw.
- `process.env` access throws (sandboxed runtime where `env` is a guarded proxy) → false, no throw.
- Bun-like environment (Node-compat process global) → boolean correctness.

Bundler-substitution scenarios (Vite / webpack DefinePlugin replacing the `process.env.NODE_ENV` literal at build time) are not exercised in this spec because they happen pre-runtime; running them under vitest would just re-test the Node-prod / browser cases above. The substitution path is covered indirectly: the literal `process.env.NODE_ENV` reference is the substitution target, and the `typeof process` guard is what keeps the post-substitution code safe in browser builds.

Together: the env spec proves the guard is correct in isolation, and the smoke script proves the full library boots under each runtime in CI.

## Benchmarks

`packages/ilingo/bench/` holds a `vitest bench` suite that pairs ilingo against `i18next` (installed as a devDep) on four workloads: cache-hit `get()`, cache-miss with a 3-deep fallback chain, plural lookup, and template with an `Intl.NumberFormat` modifier. Run with `npm run bench --workspace=packages/ilingo`.

The shared `bench/setup.ts` exports `makeIlingo()` / `makeI18next()` factories built from the same synthetic catalog so the two libraries do the same work. Each scenario is one `.bench.ts` file — keep it that way so contributors can run just the file that's relevant.

Numbers and methodology live on the `/performance` docs page. When you change something in the resolution path (orchestrator, store lookup, formatter dispatch), run the suite before and after; the `hz` ratio is the answer to "did this make ilingo slower". `bench/results.json` is gitignored — it's a per-run artifact, not a tracked baseline.

`vue-i18n` isn't part of the comparison because its API is shaped around Vue setup context; a fair comparison runs through `@ilingo/vue` not core. Planned as a separate bench page when `@ilingo/vue` benchmarks land.

## Infrastructure

None. No Docker, no databases, no network services. Tests are pure — they read fixture files from `test/data/` on local disk.

## CI Pipeline

GitHub Actions:

- `.github/workflows/main.yml` — runs on push/PR
- `.github/workflows/release.yml` — driven by release-please

Inspect those workflows for the exact matrix. Each published package declares its consumer runtime support in `engines.node`; the contributor runtime is listed in AGENTS.md.

## Writing New Tests

1. Place test files under `packages/<pkg>/test/unit/` with the `.spec.ts` extension. Mirror the `src/` directory for discoverability.
2. Import from `../../src` (relative), **not** the package's published name — tests run against TypeScript source via Vitest, not the built `dist/`.
3. If the test needs locale files on disk, drop them into `packages/<pkg>/test/data/language/<locale>/<namespace>.<ext>` and load via `FSStore` — don't write to a temp directory.
4. Run `npm run test --workspace=packages/<pkg>` to verify, then `npm run lint` (top-level) before committing. The `test/` directory is excluded from lint (`/.eslintrc` `ignorePatterns`), so style rules are relaxed there, but type errors will still surface during the build.
