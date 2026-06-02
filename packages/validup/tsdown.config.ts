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
 * `.d.ts` is emitted by a separate `tsc --emitDeclarationOnly` pass
 * (build:types) via tsconfig.build.json — plain `tsc` (no `vue-tsc`)
 * because there are no SFCs. Keeps the build:js / build:types split
 * consistent with every other package.
 */
export default defineConfig({
    entry: [
        'src/index.ts',
        'src/store/memory.ts',
        'src/store/loader.ts',
    ],
    format: 'esm',
    dts: false,
    sourcemap: true,
    clean: true,
});
