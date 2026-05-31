import { defineConfig } from 'tsdown';

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
