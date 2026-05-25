import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vitest/config';

export default defineConfig({
    plugins: [vue()],
    test: {
        environment: 'happy-dom',
        include: ['test/unit/**/*.{test,spec}.{js,ts}'],
        coverage: {
            provider: 'v8',
            include: ['src/**/*.{ts,tsx,vue}'],
            // Vue coverage trails core because the `<ITranslate>` SFC is
            // exercised through the playground, not the unit suite, and
            // composable code has reactive paths that don't always fire
            // in jsdom-style tests. Thresholds set to current baseline
            // minus ~10pp headroom; ratchet up as the suite grows.
            thresholds: {
                statements: 75,
                branches:   65,
                functions:  75,
                lines:      75,
            },
        },
    },
});
