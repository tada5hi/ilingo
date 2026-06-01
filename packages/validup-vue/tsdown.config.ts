/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { defineConfig } from 'tsdown';

/**
 * Vue surface for `@ilingo/validup`: the install plugin, the three
 * composables, the renderless component, and the `FieldTranslations`
 * Ref-shaped alias. All `@ilingo/validup` core symbols stay external —
 * consumers always have it installed alongside this package.
 *
 * `dts: false` + a separate `vue-tsc` pass because tsdown's `oxc` dts
 * pipeline doesn't understand `.vue` SFCs (this package has none, but
 * the convention matches `@ilingo/vue` / `@ilingo/vuelidate` so a
 * future SFC drops in without a build-script churn).
 */
export default defineConfig({
    entry: 'src/index.ts',
    format: 'esm',
    dts: false,
    sourcemap: true,
    clean: true,
});
