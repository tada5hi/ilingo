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
├── module.spec.ts              # Ilingo + MemoryStore: get/set, locale switching, merge()
└── utils/
    ├── identify.spec.ts        # isLineRecord type guard
    └── template.spec.ts        # {{var}} interpolation
data/
└── language/{en,de,fr}/form.{js,ts,json}   # cross-extension loader fixtures
```

### `packages/fs/test/`

```
unit/
└── module.spec.ts              # FSStore.loadGroup against test/data/language/
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

Tests assert the **public contract** of `Ilingo` and the stores — the things documented in `architecture.md`: first-hit lookup across stores, fallback to the default locale, `{{var}}` substitution, `merge()` deduping by reference identity. If a test fails after a refactor, treat it as a real regression on that contract until proven otherwise.

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

`packages/ilingo/package.json` defines `test:coverage` (`vitest run --coverage`). No coverage thresholds are enforced today; reports are informational.

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
