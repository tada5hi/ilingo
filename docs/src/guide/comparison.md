# ilingo vs. i18next

[`i18next`](https://www.i18next.com/) is the most widely-used i18n library in the JavaScript ecosystem — mature (since 2011), framework-agnostic at its core, and surrounded by a large plugin ecosystem (backends, language detection, ICU, `react-i18next`, …). It's an excellent library and the closest functional peer to ilingo.

This page is an honest side-by-side: where ilingo is the better fit, where i18next is, and how the two map onto each other. No FUD — the numbers are sourced and the tradeoffs are real.

> **The one-paragraph version.** ilingo is a smaller, faster, ESM/TypeScript-first core with batteries — lazy-loading stores, a file-system backend, locale negotiation — in the box. i18next is a larger, battle-tested ecosystem with a synchronous API, full ICU MessageFormat (via plugin), and first-party React bindings. Pick ilingo for a lean modern stack across Node / edge / browser / Vue; pick i18next for ecosystem depth, React, or full ICU.

## What they share

It's worth clearing this up first, because it's a common misconception: **modern i18next is not "non-standard" under the hood.** Since v21 it selects plural forms with [`Intl.PluralRules`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Intl/PluralRules), and since v21.3 it formats numbers / dates / lists with the `Intl.*` APIs — exactly like ilingo. So the difference is **not** "Intl-native vs. not". The real differences are bundle size, architecture, and the shape of the API.

## Bundle size

Core packages, no plugins, measured with [bundlephobia](https://bundlephobia.com) (minified, then min + gzip):

| Library | Minified | Min + gzip | Runtime deps |
|---|--:|--:|--:|
| **ilingo** — full barrel | ~15.3 kB | **~6.0 kB** | 2 (`pathtrace`, `smob`) |
| **ilingo** — `Ilingo` + `MemoryStore` | — | **~3.3 kB**¹ | — |
| i18next — core | ~42.4 kB | ~13.2 kB | 0 |

¹ ilingo's own CI-enforced budget (brotli) — see [`.size-limit.json`](https://github.com/tada5hi/ilingo/blob/master/.size-limit.json) and [Performance → Bundle size](../performance#bundle-size).

ilingo's core is **less than half** i18next's core, gzipped — and the gap widens in a real app. A typical i18next deployment adds plugins: `i18next-http-backend` (loading), `i18next-browser-languagedetector` (negotiation), each shipping more bytes. ilingo's equivalents — [`LoaderStore`](./stores#loaderstore), [`negotiateLocale` / `parseAcceptLanguage`](./locales#negotiating-a-locale-from-a-request) — are already counted inside that 6 kB. Tree-shaking goes further still: a `defineCatalog`-only import is ~1.2 kB.

ilingo declares `"sideEffects": false`, so a bundler drops every export you don't import.

## Throughput

ilingo runs **1.6× – 2.3× faster than i18next** per call across four representative workloads — *despite* ilingo's async `get()` paying a microtask per call. Full table, methodology, and hardware are on the [Performance](../performance) page; the ratios:

| Workload | ilingo / i18next |
|---|--:|
| Cache hit, simple string leaf | **2.03×** |
| Plural lookup (`count = 5`) | **2.05×** |
| Cache miss + 3-deep fallback chain | **2.33×** |
| Template + `Intl.NumberFormat` modifier | **1.63×** |

These are micro-benchmarks — read the [caveats](../performance#caveats). Per-call speed almost never dominates a real app (render and hydration do); treat it as evidence of a short resolution path, not a reason to switch on its own.

## Feature by feature

| | ilingo | i18next |
|---|---|---|
| Maturity | newer, smaller community | since 2011, very large community |
| Core size (min + gzip) | ~6.0 kB | ~13.2 kB |
| Module format | ESM-only | ESM + CJS |
| TypeScript | first-party (TS source) | first-party types |
| Plural rules | `Intl.PluralRules` | `Intl.PluralRules` (v21+) |
| Number / date / list format | `Intl.*`, built-in | `Intl.*`, built-in (v21.3+) |
| Full ICU MessageFormat (`select`, nested) | ✗ — ICU-lite (plurals + `{{var, formatter}}`) | ✓ via `i18next-icu` |
| Fallback chain | BCP-47 walk, built-in | `fallbackLng`, built-in |
| Pluggable storage | `IStore` port — memory / fs / lazy loader / custom | plugin backends |
| Lazy / code-split loading | `LoaderStore`, in-core | `i18next-http-backend` (plugin) |
| File-system backend | `@ilingo/fs`, in-core | `i18next-fs-backend` (plugin) |
| Locale negotiation | `negotiateLocale` / `parseAcceptLanguage`, in-core | `i18next-browser-languagedetector` (plugin) |
| Translate call | **async** — `get()` returns a `Promise` | **sync** — `t()` returns a string |
| Vue | `@ilingo/vue` (first-party) | `i18next-vue` (official) |
| React | — (framework-agnostic core is usable) | `react-i18next` (first-party) |
| Plugin ecosystem | small, young | large, mature |

Two rows are the actual decision points — far more than bundle bytes:

- **Sync vs. async.** i18next's `t()` is synchronous: call it in render, get a string back. ilingo's `get()` returns a `Promise`. That async surface is precisely what lets *any* store be lazy- or network-backed without an API break — it's what powers [`LoaderStore`](./stores#loaderstore) and `FSStore`. The cost is friction if you want a bare synchronous translate in a hot path. In Vue it's a non-issue: [`@ilingo/vue`](../integrations/vue)'s `useTranslation` hides the await behind a reactive `Ref`.
- **ICU MessageFormat.** i18next + [`i18next-icu`](https://github.com/i18next/i18next-icu) supports the full ICU grammar (`select`, nested plurals, ordinals). ilingo is *ICU-lite*: CLDR plural categories via [`definePlural`](./pluralization) plus `Intl` formatters via [`{{value, number(...)}}`](./formatters) — but **no** `select` / nested message grammar. If your translators rely on full ICU, stay on i18next.

## Concept mapping

Porting a mental model — or a codebase — from i18next:

| i18next | ilingo |
|---|---|
| `t('common:greeting')` | `get({ namespace: 'common', key: 'greeting' })` |
| `t('key', { name })` | `{{name}}` in the message + `data: { name }` |
| `key_one` / `key_other` suffixes | `definePlural({ one, other })` |
| namespaces (`ns`) | `namespace` argument / `defineNamespace` |
| `fallbackLng: ['de', 'en']` | `fallback` option (BCP-47 chain) |
| `i18next-http-backend` | `LoaderStore` (`loader: (l, ns) => import(...)`) |
| `i18next-fs-backend` | `@ilingo/fs` `FSStore` |
| `i18next-browser-languagedetector` | `negotiateLocale(supported, navigator.languages)` |
| `addResourceBundle(...)` | `registerStore(new MemoryStore(...))` |

See [Catalog Design](./catalog-design), [Stores](./stores), and [Locales & Fallback](./locales) for the details.

## When **not** to choose ilingo

Honest disqualifiers — reach for i18next (or [FormatJS](https://formatjs.io/)) instead if:

- You have a **large existing i18next codebase.** The migration cost rarely pays back; both are good libraries.
- You need **full ICU MessageFormat** (`select`, gender, nested plurals) — use `i18next-icu` or FormatJS.
- You're **React-first** and want the most-used, best-documented bindings — `react-i18next` has no ilingo equivalent today.
- You depend on a specific **i18next plugin** (e.g. a [locize](https://locize.com/) workflow or a particular backend connector) with no ilingo store yet.
- You want a **fully synchronous** translate function with no async surface anywhere in your stack.

If none of those apply — and a small bundle and a framework-agnostic, modern core matter to you — ilingo is built for exactly that. Start with the [Quick Start](../getting-started/quick-start).
