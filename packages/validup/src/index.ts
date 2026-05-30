/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

/**
 * Public surface of `@ilingo/validup` (framework-agnostic **core**).
 *
 * Bridges `validup` `Issue`s to `ilingo` lookups. This entry is
 * intentionally **data-free** — it carries the group/identity constants,
 * the `translateIssue` / `translateIssues` helpers, and the catalog types,
 * but imports **no** translation modules. So pulling in `@ilingo/validup`
 * (e.g. for `translateIssue` on a lazy-loaded app) never bundles the
 * EN / DE / FR / ES catalogs.
 *
 * The catalog stores live behind dedicated subpaths so you pay only for
 * the backend you choose:
 *
 * - `@ilingo/validup/store/memory` — `createMemoryStore()` (eager; all
 *   locales bundled) + `Store`, `extendStore()`, the raw per-locale
 *   catalogs.
 * - `@ilingo/validup/store/loader` — `createLoaderStore()` (lazy;
 *   per-locale dynamic `import()` chunks).
 *
 * Register either with `ilingo.registerStore(store)` — it dedupes by the
 * store's `STORE_ID` identity.
 *
 * Vue consumers add `@ilingo/validup-vue` for composables, the renderless
 * component, and the install plugin.
 */

export * from './constants';
export * from './helpers';
export * from './types';
