# Phase 7 — Roadmap to a stable ilingo

**Status**: In progress (umbrella [#917](https://github.com/tada5hi/ilingo/issues/917)).
**Tracks**: B, C, D, E, F per the umbrella. (Track A — feature surface complete — was finished by phases 1–6.)

The goal is a release where consumers can rely on additive-only changes within a major. Earning the "stable" label means closing the design decisions in Track B and the supporting work in C–E, with Track F decisions documented one way or the other.

## Track A — Feature surface complete

- [x] **Loader-based store** — shipped in PR #919 as `LoaderStore` in core.
- [x] **`FSStore` watch mode** — shipped in PR #919 (`watch: true` + optional `chokidar` peer + `InvalidatingStore` interface).
- [x] **Locale negotiation helper** — shipped in PR #918 as `negotiateLocale` + `parseAcceptLanguage` in `utils/negotiate.ts`.
- [x] **Custom formatter / interpolation modifier API** — shipped in PR #918 (`Config.formatters` + `Ilingo.registerFormatter`; `FormatterRegistry.register/get` was already public from Phase 3).

## Track B — API stability freeze

Each decision lands as a commit (often docs-only) that nails the contract. Items here are *design calls*, not pure code — pick the answer first, code/docs second.

- [x] **Plural-leaf storage forms — decision: only the `@plural` wrapper is recognised.** Since pluralization had never shipped a stable release, the bare structural form was removed outright rather than going through a deprecate-then-remove cycle (no consumers to migrate). Rationale: the structural form collided with sibling keys named after CLDR categories — the original "weird mix" complaint that motivated this work. Authoring uses `{ "@plural": ... }` literal in JSON and `definePlural({ ... })` in TS.
- [x] **Lock the `IStore` port.** Decision: freeze at `get / set / getLocales` with `invalidate / on` on the optional `InvalidatingStore` extension. `has`, `delete`, `getKeys`, batch `getAll` were each considered and deferred — see `packages/ilingo/src/store/types.ts` JSDoc on `IStore` for the recorded rationale per method. Future capabilities follow the same opt-in-interface-plus-type-guard pattern.
- [x] **Audit `Config` / `ConfigInput`.** Every field on `Config` is now optional, matching the runtime contract (the constructor applies a default for each absent entry). `ConfigInput` is a back-compat alias — the historical "input vs resolved" split was misleading because no field is ever required at runtime. The sibling `@ilingo/fs` `Config + ConfigInput` pair stays as-is because it *does* perform normalization (`directory: string | string[] → string[]`).
- [x] **Parallel-store-query semantics — decision: switch the default to serial-on-miss.** Within each locale, stores are now walked serially in insertion order and the lookup stops at the first hit. A network-backed adapter registered after a Memory adapter is never called when the Memory adapter answers. Trade-off accepted: when every registered store would have hit, latency is `sum(per-store)` instead of `max(per-store)` — rare in practice, and the in-tree adapters are sync after their first warm-up. The per-store `lazy: true` flag option was rejected as solving the footgun in the more-complicated direction.
- [x] **Confirm `Ilingo<Catalog>` inference.** Gap-filled via additional `*.spec-d.ts` cases: `getResolvedLocale` mirrors `get()` constraints; `getResolvedLocaleChain` stays locale-only and accepts arbitrary BCP-47 strings; `MissingKeyContext` deliberately stays loose under a typed catalog; `registerFormatter` and `merge` compose across typed/loose instances; `clone()` rebinds to `Ilingo<LocalesRecord>` (documented limitation); `definePlural` in diverging-locale shapes still triggers `count`-required inference.

## Track C — Docs completeness + migration

- [x] **`catalog-design` guide page** covering `defineCatalog` / `definePlural` workflow + JSON-vs-TS authoring trade-offs. Lives at `docs/src/guide/catalog-design.md`; wired into the "Concepts" sidebar between Overview and Stores. Cross-linked from the overview page.
- [x] **Migration guide** enumerating breaking changes since `5.0.0`. Originally framed as "Upgrading to Stable" but trimmed to "From 5.0" — a focused list of breakages a consumer would hit upgrading from the published 5.0.0 to whatever the next release cuts. Purely-additive features are not duplicated here; they live in the matching guide pages. Lives at `docs/src/migration/from-5.0.md` under a new top-level Migration nav entry.
- [x] **SSR integration recipe.** Lives at `docs/src/recipes/ssr.md` under a new top-level "Recipes" nav entry. Four framework-agnostic building blocks (per-request `Ilingo`, locale negotiation, `LoaderStore` for lazy locales, hydration patterns A and B) followed by concrete Nuxt and Astro slots and an edge-runtime note. Cross-linked from `guide/locales.md` so SSR users land on the recipe from the locale-negotiation section.
- [x] **Doc-anchor audit** — every public symbol mentioned in a package README has at least one anchor on the docs site. Gaps that surfaced and were patched: `MissingKeyHandler` (now referenced in `missing-key.md` alongside the existing `MissingKeyContext` table), `bcp47Parents` + `resolveLocaleChain` (now under a "Low-level helpers" section in `locales.md`).

## Track D — Test + benchmark floor

- [x] **Vitest coverage thresholds** per package. Floors set in each package's `test/vitest.config.ts` with ~5pp headroom on most metrics (10pp on the noisier branch metric in `@ilingo/fs` and `@ilingo/vue`). CI now runs `npm run test:coverage` so threshold violations fail the build. Policy + per-package numbers documented in `.agents/testing.md`. `@ilingo/vuelidate` skipped — no unit suite there.
- [ ] **Benchmark suite** (`packages/ilingo/bench/`) via `vitest bench`. Cover: cache-hit `get()`, cache-miss with 3-deep fallback, plural lookup, template render with one `number` modifier. Numbers land on a docs Performance page; re-run in CI on every release-please PR.
- [ ] **Comparative numbers** vs `i18next` and `vue-i18n` for the same workloads — backs up the "lightweight alternative" README claim with receipts.

## Track E — Bundle + browser story

- [ ] **`sideEffects: false` audit** for `ilingo` and `@ilingo/vue`. Verify no top-level side effects so Vite/webpack tree-shaking works.
- [ ] **Bundle-size budget** per package in CI (`size-limit` or `pkg-size`). Fail PRs that blow past it without justification.
- [ ] **Cross-runtime smoke tests** for the `typeof process !== 'undefined'` guard around `NODE_ENV`. Cover Vite dev, Vite prod with DefinePlugin, raw browser ESM, Cloudflare Workers, Bun.

## Track F — Ecosystem decisions (in / out / deferred)

For each, decide and document; either commit to building it or close as out of scope.

- [ ] **`@ilingo/nuxt` module** — build vs delegate to a community recipe?
- [ ] **`@ilingo/standard-schema` adapter** — viable for resolving translation keys against a schema-validated catalog?
- [ ] **Extraction / unused-key CLI** — default: out of scope for stable; revisit post-stable.
- [ ] **ICU MessageFormat** — default: out of scope (covered by plural + Intl + custom formatter).
- [ ] **SSR hydration helpers** — default: framework adapters own this; base utility deferred.

## Sequencing

Tracks B → C → D/E in roughly that order. Track F decisions can land any time but are mostly meta — they don't block the stable cut, only the release notes.

Within Track B: items are largely independent, so pick whichever has the most-impactful open question first. The umbrella issue notes that B items either ratify or change today's behaviour — most won't ship breaking code, just decisions + docs.

## Done condition

Every Track A–E checkbox is checked or explicitly closed `wontfix`, and every Track F item has a decision recorded in this file (or the linked PR). At that point a major-version cut is appropriate.
