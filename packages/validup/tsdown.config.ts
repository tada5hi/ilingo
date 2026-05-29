/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { defineConfig } from 'tsdown';

/**
 * Pure-core build. No vue / @vueuse / @ilingo/vue / @validup/vue
 * in the import graph — the Vue surface lives in `@ilingo/validup-vue`.
 *
 * `dts: true` lets tsdown emit `.d.mts` directly (no `vue-tsc` needed
 * because no SFCs).
 */
export default defineConfig({
    entry: 'src/index.ts',
    format: 'esm',
    dts: true,
    sourcemap: true,
    clean: true,
});
