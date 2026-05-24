# Phase 3 — Intl formatters

**Status**: Done.
**Tracks**: [#896](https://github.com/tada5hi/ilingo/issues/896).

Add `Intl.NumberFormat`, `Intl.DateTimeFormat`, and `Intl.ListFormat` support to the template formatter so consumers don't have to pre-format values in calling code.

## Scope

- Extend the template syntax: `{{value, number}}`, `{{value, number(currency=EUR)}}`, `{{value, date(dateStyle=medium)}}`, `{{value, list(style=long, type=conjunction)}}`.
- Parse the modifier inside `packages/ilingo/src/utils/template.ts` — keep it simple (no nested calls; one modifier per placeholder).
- Each modifier resolves to a `Intl.*Format` instance keyed by `(locale, options)`. Memoize per `Ilingo` instance so repeat renders don't allocate.
- Locale comes from the `GetContext.locale` (or the orchestrator default) — same source as the message lookup.
- Register the three built-ins via the **same** internal table that #906 will expose publicly. Designing the table now means #906 becomes "open the table to user-supplied entries."

## Files touched

- `packages/ilingo/src/utils/template.ts` — parser + modifier dispatch.
- `packages/ilingo/src/utils/formatters.ts` (**new**) — built-in registry, options-string parser, memoized `Intl.*Format` cache.
- `packages/ilingo/src/module.ts` — pass `locale` into the formatter call (currently `format(input, data)` discards locale).
- `packages/ilingo/test/unit/utils/template.spec.ts` — new cases per formatter.

## Acceptance

- [x] `"You owe {{amount, number(currency=EUR, style=currency)}}"` renders correctly for `en` and `de` (resolved-locale propagation tested).
- [x] Unknown modifier falls back to the raw value (no throw) and emits a per-instance dev-only warn-once via `Ilingo.handleUnknownFormatter` (mirrors the missing-key diagnostic shape). Production is silenced via the same `isProductionEnv()` gate.
- [x] Formatter cache lives on the `Ilingo` instance — asserted by reading the registry's `cache.size` after repeated renders.
- [x] Tightened modifier parser rejects malformed names (`number)`, stray punctuation) instead of treating them as valid identifiers.

## Why now

Independent of the resolution-path work, so it can be parallelized with Phase 4 (#898). Lands the *internal* formatter registry that Phase 6's #906 will open up — doing them out of order means rewriting the registry twice.
