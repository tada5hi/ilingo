# Performance

ilingo is built to be a small, fast i18n library. This page shows the numbers and how they were measured. They aren't marketing claims — the benchmark suite lives in `packages/ilingo/bench/`, you can run it locally with `npm run bench --workspace=packages/ilingo`, and a fresh `results.json` lands every time.

## Headline numbers

Per-call throughput on four representative workloads, compared against [`i18next`](https://www.i18next.com/) — the most widely-used JS i18n library and the closest functional peer (shared catalog, plural rules, interpolation, fallback chain). Numbers in operations per second; higher is better.

| Workload | ilingo (ops/s) | i18next (ops/s) | ilingo / i18next |
|---|--:|--:|--:|
| Cache hit, simple string leaf | 1,528,857 | 753,082 | **2.03×** |
| Plural lookup (`count=5`) | 895,483 | 437,527 | **2.05×** |
| Cache miss + 3-deep fallback chain | 742,703 | 318,299 | **2.33×** |
| Template + `Intl.NumberFormat` modifier | 571,205 | 349,604 | **1.63×** |

ilingo wins on every scenario despite the async API surface (every `get()` is a `Promise`, paying a microtask round-trip per call). The async hit is real but the orchestrator's overall path is shorter — locale-first serial walk, single-table dotted-path traversal, no plugin/format-resolver indirection.

## Methodology

- Tool: [vitest's `bench` mode](https://vitest.dev/api/vi.html#bench), which delegates to [tinybench](https://github.com/tinylibs/tinybench) for warmup, sample count, and statistical noise handling.
- Reported metric: `hz` (operations per second) — tinybench's headline number, derived from sample mean over a several-hundred-thousand-call window.
- Catalog: a synthetic ~30-key catalog spanning two namespaces, plain strings, nested namespaces, one plural leaf, one number-format leaf. See `packages/ilingo/bench/setup.ts`.
- Hardware (the numbers above): Apple M4 Pro, macOS Darwin 24.6.0 arm64, Node v24.15.0. Your numbers will vary in absolute terms — the *ratio* between contenders is the durable part.
- ilingo and i18next instances are constructed once outside the timed block; the bench measures only the per-call cost.
- For a fair compare, the two libraries are configured to do the same work: same fallback chain (`pt-BR → pt → en` in the fallback scenario), same plural categories, same `Intl.NumberFormat({ currency: 'EUR' })` formatter. i18next's namespace concept maps onto our `namespace` argument; its plural-suffix convention (`items_one`, `items_other`) is rebuilt from our `definePlural` shape at setup time.

## Why ilingo is fast

Three design choices add up:

1. **Single-pass dotted-path traversal.** `MemoryStore.get` does one `pathtrace.getPathValue` call against a plain nested object. There's no resolver chain, no plugin layer, no key parser.
2. **Serial-on-miss store composition.** A request that hits the first registered store never touches any other store. (See [Stores → Multiple stores](./guide/stores#multiple-stores).) Network-backed adapters pay zero cost when a Memory adapter has the key.
3. **Per-instance memoisation.** `Intl.PluralRules` and `Intl.NumberFormat` / `Intl.DateTimeFormat` / `Intl.ListFormat` instances are cached on the `Ilingo` instance and reused. The plural-rules cache is keyed by locale; the formatter cache is keyed by `(formatter, locale, JSON-encoded options)`.

The async API is intentional — it's what allows `LoaderStore` (lazy code-split locales) and `FSStore` (file-system reads), and what makes future network-backed adapters feasible without an API break. The microtask overhead is the price for that capability; the rest of the path is fast enough to absorb it.

## Bundle size

`ilingo`'s production runtime depends only on [`pathtrace`](https://www.npmjs.com/package/pathtrace) and [`smob`](https://www.npmjs.com/package/smob). Vue and Vuelidate are peer dependencies in `@ilingo/vue` / `@ilingo/vuelidate`, never bundled. The core ships as a single ESM bundle (`dist/index.mjs`); subpath exports let consumers split feature surfaces.

A dedicated [`size-limit`](https://github.com/ai/size-limit) CI gate enforces a per-package byte budget: CI runs `npm run size` against the limits declared in `.size-limit.json` (brotli, gzipped) and fails the build on any regression.

## Re-running the suite

```bash
# From the repo root
npm run bench --workspace=packages/ilingo
```

The suite writes `packages/ilingo/bench/results.json` (gitignored) — useful for CI integration. Each scenario is a separate `.bench.ts` file so you can run one in isolation:

```bash
cd packages/ilingo
npx vitest bench --config bench/vitest.config.ts --run bench/get-cache-hit.bench.ts
```

When you change something in the resolution path, run the suite before and after. The reported `hz` ratio between runs is the answer to "did this make ilingo slower?".

## Adding a benchmark

A new scenario is one file:

```typescript
// packages/ilingo/bench/your-scenario.bench.ts
import { bench, describe } from 'vitest';
import { makeI18next, makeIlingo } from './setup';

describe('your scenario', () => {
    const ilingo = makeIlingo();
    const i18n = makeI18next();

    bench('ilingo', async () => {
        await ilingo.get({ namespace: 'app', key: 'greeting' });
    });

    bench('i18next', () => {
        i18n.t('app:greeting');
    });
});
```

The shared `setup.ts` already exports pre-built ilingo and i18next instances against the same catalog. Add a comparative `bench()` block per contender — vitest namespaces them in the output.

## Caveats

- These are micro-benchmarks. Real-world performance is dominated by render cycles, hydration costs, and bundle parse time. ilingo being 2× faster than i18next per call rarely makes a user-visible difference unless you're rendering tens of thousands of translated strings per frame.
- The async hit on ilingo is the *floor* — every call pays it. If you call `get()` inside a tight loop and don't await between iterations, the microtask queue resolves them in batches; effective throughput stays close to the bench numbers above.
- `vue-i18n` isn't included in this comparison because its API is shaped around Vue component context (`useI18n` / `t` from setup), not a standalone translator. A `vue-i18n.global.t(...)` comparison would test a path most users don't run; planning a separate `@ilingo/vue` benchmark page for the Vue-specific composables.
