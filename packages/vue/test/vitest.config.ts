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
        },
    },
});
