import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        include: ['test/unit/**/*.{test,spec}.{js,ts}'],
        coverage: {
            provider: 'v8',
            include: ['src/**/*.{ts,tsx,js,jsx}'],
            // Branch threshold is intentionally loose: FSStore has many
            // optional code paths (watch mode, multi-directory, chokidar
            // peer detection) that fire only under specific configs.
            // See `.agents/testing.md` for the policy.
            thresholds: {
                statements: 85,
                branches:   60,
                functions:  80,
                lines:      85,
            },
        },
    },
});
