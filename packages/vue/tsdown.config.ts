import { defineConfig } from 'tsdown';
import Vue from 'unplugin-vue/rolldown';

export default defineConfig({
    entry: 'src/index.ts',
    format: 'esm',
    dts: false,
    sourcemap: true,
    clean: true,
    plugins: [Vue()],
});
