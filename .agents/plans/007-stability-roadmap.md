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

- [ ] **Plural-leaf storage forms.** Keep both the explicit `{ "@plural": { ... } }` form and the bare structural `{ one, other }` form, OR drop the structural form at the next major. The explicit form avoids collisions with sibling keys that happen to match a CLDR category; the structural form is convenient for hand-written JSON. **Decision required**.
- [ ] **Lock the `IStore` port.** Today's port is `get / set / getLocales`, with `invalidate / on` on the optional `InvalidatingStore` extension. Before freezing, decide whether we want `has(ctx)`, `delete(ctx)`, `getKeys(group)`, batch `getAll(locale, group)`, or any of those promoted from optional. Last opportunity to add them without breaking external adapters.
- [ ] **Audit `Config` / `ConfigInput`.** Cross-check that `store`, `locale`, `fallback`, `onMissingKey`, `formatters` are the right shape; ensure all are appropriately optional via `Partial<Config>` and that doc comments match runtime behaviour.
- [ ] **Parallel-store-query semantics.** Today every store sees every call within a locale, first-hit wins. Fine for in-memory + fs; a footgun for network-backed stores. Keep, or expose a per-store `lazy: true` flag that defers the call until earlier stores have missed?
- [ ] **Confirm `Ilingo<Catalog>` inference.** Type-test edge cases: nested-locale shapes, plural-leaf inference through dotted paths, `MissingKeyContext` under a typed catalog. Add any missing tests; fix any gaps before the freeze.

## Track C — Docs completeness + migration

- [ ] **`catalog-design` guide page** covering `defineCatalog` / `definePlural` workflow + JSON-vs-TS authoring trade-offs.
- [ ] **"Upgrading to stable" guide** enumerating breakages from `ilingo@5.x` / `@ilingo/vue@5.x` to the stable cut, with before/after snippets where the change is mechanical.
- [ ] **SSR integration recipe** — at least one. Nuxt is the obvious target since `vue-i18n`'s strongest consumer story is there. Astro is a strong second.
- [ ] **Doc-anchor audit** — every public export listed in package READMEs has a matching anchor on the docs site.

## Track D — Test + benchmark floor

- [ ] **Vitest coverage thresholds** per package. Coverage data is collected today (provider `v8`, `include: ['src/**/*.{ts,tsx,js,jsx}']`) but no thresholds → regressions silent. Pick a floor from current numbers; ratchet over time.
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
