# Testing

## Setup

- **Runner**: [Vitest](https://vitest.dev/) (v4)
- **Test location**: `packages/<pkg>/test/unit/**/*.spec.ts`
- **Fixtures**: `packages/<pkg>/test/data/` — real locale files loaded at test time (no mocking of the filesystem)
- **Config**: `packages/<pkg>/test/vitest.config.ts` per package; the test script (`vitest --config test/vitest.config.ts --run`) sets `NODE_ENV=test` via `cross-env`. Coverage is configured but not enforced via thresholds.

Only `ilingo` and `@ilingo/fs` have tests today. `@ilingo/vue` and `@ilingo/vuelidate` ship a `playground/` Vite app instead of a unit suite — manual verification through the playground is the current convention there.

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

### `packages/ilingo/test/`

```
unit/
├── module.spec.ts                  # legacy core behaviour — get/set, locale switching, merge()
├── resolution.spec.ts              # pluralization (incl. explicit @plural form), fallback chain
│                                   #   (default, string, array, function, false, []), missing-key
│                                   #   handler, per-instance warn isolation, serial intra-locale store walk
├── formatters-integration.spec.ts  # end-to-end Ilingo.get() with number/date/list modifiers,
│                                   #   resolved-locale propagation, per-instance cache, dev-warn
├── custom-formatters.spec.ts       # registerFormatter + Config.formatters; built-in override; clone shares
├── loader-store.spec.ts            # LoaderStore lazy load, dedupe, cache, miss cache, invalidate, events
├── types.spec-d.ts                 # compile-time-only — typed-catalog inference, plural-key
│                                   #   count requirement, defineCatalog narrowing.
│                                   #   Run via `npm run test:types --workspace=packages/ilingo`
│                                   #   (vitest --typecheck against `*.spec-d.ts`)
└── utils/
    ├── identify.spec.ts            # isLineRecord / isPluralLeaf / isPluralForms
    ├── locale.spec.ts              # bcp47Parents, resolveLocaleChain (incl. opt-out forms)
    ├── formatters.spec.ts          # parseFormatterOptions, parseModifier, FormatterRegistry,
    │                               #   template-level modifier dispatch
    └── template.spec.ts            # {{var}} interpolation
data/
└── language/{en,de,fr}/form.{js,ts,json}   # cross-extension loader fixtures
```

### `packages/vue/test/`

```text
unit/
├── component-t.spec.ts         # <ITranslateT> — slot rendering, vars, fragments, error paths
├── directive-t.spec.ts         # v-t directive — string/object bindings, reactive locale, opt-out
├── invalidation.spec.ts        # useTranslation re-runs on InvalidatingStore.invalidate() (scoped)
└── scoped-catalog.spec.ts      # useScopedCatalog — same-component t, descendant provide, no-leak, fallback
```

The Vue package uses **happy-dom** for the DOM environment and **@vue/test-utils**'s `mount` + `flushPromises` for component rendering. Plain `nextTick` is not enough — `useTranslation` resolves through `computedAsync`, which needs the microtask queue flushed.

### `packages/fs/test/`

```
unit/
├── module.spec.ts              # FSStore.loadGroup against test/data/language/ + fallback semantics
├── persist.spec.ts             # set() round-trip, sibling preservation, nested keys,
│                               #   split read/write directories
└── watch.spec.ts               # FSStore({ watch: true }) emits invalidate on file change;
                                #   manual invalidate() drops cache; close() teardown is idempotent.
                                #   Needs the optional `chokidar` peer dep installed (it is, devDep).
data/
└── language/{en,de,fr}/form.{cjs,ts,json}  # exercises locter's multi-extension resolution
```

## Test Helpers & Fixtures

- There is no shared test-utility module. Tests construct stores directly with literal data, e.g.:
  ```typescript
  const ilingo = new Ilingo({ store: new MemoryStore({ data: { ... } }) });
  ```
- `test/data/language/<locale>/<group>.{ts,js,json,cjs}` doubles as both a fixture and a smoke test of `FSStore`'s loader extension matrix.

## Testing Philosophy

Tests assert the **public contract** of `Ilingo` and the stores — the things documented in `architecture.md`: locale-first walk with fallback chain, serial intra-locale store walk (stop at first hit), plural selection via `Intl.PluralRules`, missing-key handler routing, `{{var}}` substitution, `merge()` deduping by reference identity. If a test fails after a refactor, treat it as a real regression on that contract until proven otherwise.

For tests covering store call order (serial walk, fallthrough, debounce, etc.), assert the **invariant** (e.g. "later stores were not called when the first hit") with a recording fake — never wall-clock thresholds, which flake on CI scheduler jitter.

### Fakes Over Mocks

`MemoryStore` is itself the canonical fake for the `IStore` port — it implements the full interface with in-memory state. Use it directly instead of reaching for `vi.fn()` / `vi.mock()`:

```typescript
// Good — real implementation of the port, no mocking layer
const store = new MemoryStore({ data: { en: { app: { hi: 'Hello' } } } });
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

## Infrastructure

None. No Docker, no databases, no network services. Tests are pure — they read fixture files from `test/data/` on local disk.

## CI Pipeline

GitHub Actions:

- `.github/workflows/main.yml` — runs on push/PR
- `.github/workflows/release.yml` — driven by release-please

Inspect those workflows for the exact matrix; the package-level `engines` field declares support for Node `^20.19 || ^22.13 || ^23.5 || >=24`, so CI should exercise at least one supported major.

## Writing New Tests

1. Place test files under `packages/<pkg>/test/unit/` with the `.spec.ts` extension. Mirror the `src/` directory for discoverability.
2. Import from `../../src` (relative), **not** the package's published name — tests run against TypeScript source via Vitest, not the built `dist/`.
3. If the test needs locale files on disk, drop them into `packages/<pkg>/test/data/language/<locale>/<group>.<ext>` and load via `FSStore` — don't write to a temp directory.
4. Run `npm run test --workspace=packages/<pkg>` to verify, then `npm run lint` (top-level) before committing. The `test/` directory is excluded from lint (`/.eslintrc` `ignorePatterns`), so style rules are relaxed there, but type errors will still surface during the build.
