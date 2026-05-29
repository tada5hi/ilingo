/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

/**
 * Public surface of `@ilingo/validup` (framework-agnostic core).
 *
 * Bridges `validup` `Issue`s to `ilingo` lookups with a pre-seeded EN /
 * DE / FR / ES catalog. No `vue` / `@vueuse/core` / `@ilingo/vue` imports
 * anywhere on this surface — embeddable in any runtime (Node SSR, edge,
 * worker) that just needs to translate an issue tree.
 *
 * Vue consumers (composables, renderless component, install plugin)
 * import from `@ilingo/validup/vue`, which re-exports everything here
 * plus the Vue-coupled surface.
 */

export * from './constants';
export * from './helpers';
export * from './store';
export * from './translations';
export * from './types';
