# Loaders

## `LoaderStore`

`packages/ilingo/src/store/loader.ts`. Lazy-loaded store backed by a user-supplied `loader(locale, namespace) => Promise<Translations | undefined>`. Caches per `(locale, namespace)` so the loader is called at most once per pair until `invalidate()` is called. De-duplicates concurrent `get()`s for the same pair via an in-flight map.

Misses (loader returning `undefined`) are cached too — the loader isn't re-called for known-missing pairs. Designed for browser code-splitting: typical loader is `(l, g) => import(\`./locales/${l}/${g}.json\`).then(m => m.default)`.

`getLocales()` returns the declared `locales: string[]` option when provided; otherwise the set of locales seen so far (best-effort).


## `FSStore` load bookkeeping

Both load paths are generated from **one** body (`readNamespaceBody`) via the [`twinop`](https://github.com/tada5hi/twinop) package: a generator yields `op(asyncThunk, syncThunk)` pairs and two drivers (`runTwinAsync` / `runTwinSync`) execute the side they stand for, re-entering effect errors with `Generator.throw` so `try`/`catch` behaves identically in both. The point is not the I/O — it is everything *around* it (the loaded flag, the in-flight dedup, the generation guard, the merge order), which two hand-written copies would let drift until `get` and `getSync` disagreed. That drift is exactly the bug class this feature kept hitting; one body cannot drift from itself. The protocol is a dependency, not vendored code: `locter` and `validup` drive their own twins with the same package.

`loadNamespace` sets the `loaded` flag **after** the file data is merged, not before, and de-duplicates concurrent callers through a `loading` map keyed by `(locale, namespace)`. Both details are load-bearing for the sync path: `isLoaded` has to mean "the data is here", or `getSync` would report a definite miss during the in-flight window and let the orchestrator resolve a farther locale that the pending read is about to contradict.

Setting the flag eagerly was also a pre-existing async bug (found while auditing #988): a second concurrent `get()` short-circuited on the flag, read the still-empty record, and resolved to `undefined`. The in-flight map fixes both.

`loadNamespaceSync` is the public sync twin — it primes the store without an `await`, and `getSync` uses it for a cold namespace. It cannot await a load already in flight asynchronously, so it re-reads instead; both writes produce the same merged record, making the duplicate work wasteful but never inconsistent.

`invalidate()` bumps a `generation` counter that a read captures at its start; a read whose generation changed discards its result instead of repopulating a cache the consumer just dropped. Same guard as `LoaderStore` — and it matters more now that the flag is set at the end, since a stale write would otherwise also mark the namespace loaded.


## `FSStore.watch`

`packages/fs/src/module.ts`. Optional `watch: boolean` config field. When true, lazy-imports `chokidar` (declared as an *optional* peer dependency in `@ilingo/fs/package.json`) and starts a watcher over the configured directories. File changes under `<dir>/<locale>/<namespace>.<ext>` are mapped back to `(locale, namespace)` via `parseLocaleNamespace`, which strips the directory prefix and validates the locale segment against `isBCP47LanguageCode`.

`chokidar` is an optional peer because most production deployments don't want a file watcher running — and the dep weight is ~1MB. If `watch: true` is set without chokidar installed, the store logs a one-line error and continues without watching (the rest of the store works normally).

`close()` stops the watcher and detaches all listeners — idempotent, callable in tests and on app shutdown.


## Locale negotiation utilities

`packages/ilingo/src/utils/negotiate.ts` exposes two pure helpers for picking a locale from a request:

- `negotiateLocale(supported, requested): string | undefined` — BCP-47 best-match (exact → prefix → parent walk). Returns the matching entry from `supported`, preserving its original casing.
- `parseAcceptLanguage(header): string[]` — parses an RFC 9110 `Accept-Language` header into a quality-sorted tag list (drops `*`).

These are utility-style — they don't touch `Ilingo` state. Callers compose them: `ilingo.setLocale(negotiateLocale(supported, requested) ?? defaultLocale)`. Kept in core so server-side (Express / Hono / Nuxt server routes) and client-side (`navigator.languages`) consumers share the same matcher.
