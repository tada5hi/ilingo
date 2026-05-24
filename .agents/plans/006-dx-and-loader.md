# Phase 6 — DX + loader-based store

**Status**: Split into two waves —
- **Phase 6A** (#905 + #906): Done (merged as #918).
- **Phase 6B** (#903 + #904): In review (branch `feat/loader-store-and-watch`).

**Tracks**: [#903](https://github.com/tada5hi/ilingo/issues/903), [#904](https://github.com/tada5hi/ilingo/issues/904), [#905](https://github.com/tada5hi/ilingo/issues/905), [#906](https://github.com/tada5hi/ilingo/issues/906).

Four loosely-coupled DX features. They can land in any order, but #903 + #904 share the `invalidate()` cache surface so coordinate those two.

## Scope

### #903 — Loader-based store

- New `LoaderStore` in a new package `@ilingo/loader` (or in core — decide based on whether it pulls runtime deps). Constructor takes `loader: (locale, group) => Promise<LinesRecord>` and caches results per `(locale, group)`.
- Browser/SPA target — supports dynamic `import()` of locale chunks (`() => import('./locales/en/app.json')`).
- Exposes `invalidate(locale?, group?)` to drop cached entries (used by #904 and by `useTranslation` when scoped messages mount).

### #904 — `FSStore` watch mode

- Optional `watch: boolean` on `FSStore` config. When true, `chokidar`-watch the configured directories; on change, call `invalidate(locale, group)` and emit an event so the Vue composable can re-fetch.
- `FSStore` gains an `EventTarget`-style API (`on('invalidate', listener)`).
- Vue composable subscribes to that event in `dev` mode and re-evaluates the `computedAsync`.

### #905 — Locale negotiation

- `negotiateLocale(supported: string[], requested: string[]): string | undefined` utility — implements BCP-47 best-match (longest matching prefix, then language-only).
- Accepts `Accept-Language` header strings (parse and weight via `q=`).
- Exported from `ilingo` core; composed with `Ilingo.setLocale()` by the caller — no automatic wiring (server vs. browser is the consumer's choice).

### #906 — Custom formatter API

- Open the formatter registry built in Phase 3: `ilingo.registerFormatter(name, factory)`. Factory receives `(locale, options) => (value) => string`.
- Built-in `number`, `date`, `list` formatters become entries in the same map (no special-casing).
- `Config.formatters` accepts a record of factories at construction time as syntactic sugar over `registerFormatter`.

## Files touched

- `packages/loader/` — new workspace (if scoped to a package; otherwise `packages/ilingo/src/store/loader.ts`).
- `packages/fs/src/module.ts` — watch hook, event emitter.
- `packages/fs/package.json` — `chokidar` as an optional peer dep.
- `packages/ilingo/src/utils/negotiate.ts` (**new**).
- `packages/ilingo/src/utils/formatters.ts` — public `register*` surface, opened from Phase 3.
- `packages/ilingo/src/module.ts` — `registerFormatter`, `Config.formatters`.
- `packages/vue/src/composables/use-translation.ts` — subscribe to store invalidation events.

## Acceptance

- [x] `new LoaderStore({ loader: (l, g) => import(`./locales/${l}/${g}.json`) })` resolves a key from a code-split chunk. Asserted in `loader-store.spec.ts`. Loader is called once per `(locale, group)`; concurrent `get()`s share one invocation; misses are cached.
- [x] `FSStore({ watch: true })`: editing a watched file emits `invalidate` and the next `get()` reflects the new content. Asserted in `packages/fs/test/unit/watch.spec.ts`. `chokidar` is an optional peer dependency.
- [x] `negotiateLocale(['en', 'pt-BR'], ['pt-PT', 'pt', 'en'])` returns `'pt-BR'` (longest prefix wins). Asserted in `test/unit/utils/negotiate.spec.ts`.
- [x] `ilingo.registerFormatter('upper', (value, _options, locale) => String(value).toLocaleUpperCase(locale))` works inside `{{name, upper}}`. Plus a `Config.formatters` constructor-time sugar covered in `custom-formatters.spec.ts`. Signature is `(value, options, locale) => string` — same as built-in formatters.

## Why last

Each item here either depends on the formatter registry (Phase 3) or the composable wiring (Phase 5). Landing them last means they slot into a stable surface without churn.
