import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        include: ['test/unit/**/*.{test,spec}.{js,ts}'],
        coverage: {
            provider: 'v8',
            include: ['src/**/*.{ts,tsx,js,jsx}'],
            // Floors picked from current numbers with ~5pp headroom for
            // routine churn; tighter thresholds get ratcheted up manually
            // when a sustained baseline emerges. See `.agents/testing.md`
            // for the policy.
            thresholds: {
                statements: 90,
                branches:   80,
                functions:  85,
                lines:      90,
            },
        },
    },
});
