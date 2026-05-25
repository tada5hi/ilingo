/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        include: ['bench/**/*.bench.ts'],
        benchmark: {
            // Stable defaults — tinybench warms up + averages internally.
            // Reporters default to the verbose text reporter, which is
            // what `npm run bench` prints to stdout.
            outputJson: 'bench/results.json',
        },
    },
});
