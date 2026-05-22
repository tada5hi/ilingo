import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        include: ['test/unit/**/*.{test,spec}.{js,ts}'],
        // Type-level tests (`*.spec-d.ts`) are run by `vitest --typecheck` —
        // see the `test:types` package script. They are intentionally not
        // part of the default run because typecheck is slow.
        typecheck: {
            tsconfig: './tsconfig.json',
            include: ['test/unit/**/*.spec-d.ts'],
        },
        coverage: {
            provider: 'v8',
            include: ['src/**/*.{ts,tsx,js,jsx}'],
        },
    },
});
