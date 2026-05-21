# Phase 2 — Resolution-path features

**Status**: Blocked by Phase 1.
**Tracks**: [#895](https://github.com/tada5hi/ilingo/issues/895), [#897](https://github.com/tada5hi/ilingo/issues/897), [#899](https://github.com/tada5hi/ilingo/issues/899).

Three features that all change how `Ilingo.get()` resolves a `(locale, group, key)` to a string. Per #907's sequencing they ship together so the tests are written against the final lookup shape — landing them serially would force two test rewrites.

## Scope

### #895 — Pluralization via `Intl.PluralRules`

- Extend `LinesRecord` so a leaf can be either `string` (current) or an object keyed by CLDR plural category (`zero | one | two | few | many | other`).
- `get()` accepts an optional `count: number` in `GetContext`. When present and the leaf is plural-shaped, resolve via `new Intl.PluralRules(locale).select(count)` with `other` fallback.
- Update `MemoryStore.get` to return the matched leaf branch; the orchestrator picks the plural form.
- Pass `count` into the template formatter as `data.count` automatically (so `"{{count}} items"` Just Works without the caller restating it).

### #897 — Region-aware fallback chain

- `Config` gains `fallback?: string | string[] | ((locale: string) => string[])`.
- Default behavior: for `pt-BR`, derive `[pt-BR, pt, en]` (configured default → ultimate `LOCALE_DEFAULT`).
- `Ilingo.get()` walks the resolved chain *per store*, returning the first hit — current single-store, single-locale logic becomes the no-fallback case.
- Add `getResolvedLocale(ctx)` so consumers (and the Vue composable) can show which locale a message actually came from.

### #899 — Missing-key handler + dev warnings

- `Config` gains `onMissingKey?: (ctx: GetContext & { resolvedLocale?: string }) => string | void`.
- When `get()` exhausts all stores and the chain, invoke the handler. Default behavior in `NODE_ENV !== 'production'`: `console.warn` with the same shape that `useTranslation` falls back to (`"${group}.${key}"`).
- In production: silent `undefined` (current behavior).
- The Vue composable's fallback string moves behind the handler so callers can override it once globally.

## Files touched

- `packages/ilingo/src/types.ts` — extend `LinesRecord` + `GetContext`.
- `packages/ilingo/src/module.ts` — rewrite the get-loop.
- `packages/ilingo/src/config/type.ts` — `fallback`, `onMissingKey`.
- `packages/ilingo/src/store/memory.ts` — leaf-return semantics.
- `packages/ilingo/src/utils/locale.ts` (**new**) — `resolveLocaleChain(locale, fallback, default)`.
- `packages/ilingo/test/unit/module.spec.ts` — new cases for plural, chain, missing-key.
- `packages/vue/src/composables/use-translation.ts` — route fallback through `onMissingKey`.

## Acceptance

- [ ] Plural catalogs round-trip through `MemoryStore` and `FSStore`.
- [ ] `get({ group, key, count: 0 })` matches `zero` where defined, `other` otherwise.
- [ ] `get({ ..., locale: 'pt-BR' })` falls back to `pt` then to the default in the documented order.
- [ ] Default dev-mode warning fires exactly once per missing key per process (memoize the warning set).
- [ ] All existing tests still pass with no opt-in needed (backwards compatible for `string` leaves).

## Why this wave

All three features touch the same code path in `Ilingo.get()` and share test scaffolding for `LocalesRecord` fixtures. Landing them in one PR avoids two iterations of "rewrite the spec to fit the next change."
