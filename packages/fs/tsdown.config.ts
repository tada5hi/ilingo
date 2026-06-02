import { defineConfig } from 'tsdown';

export default defineConfig({
    entry: 'src/index.ts',
    format: 'esm',
    // `.d.ts` is emitted by a separate `tsc --emitDeclarationOnly` pass
    // (build:types) via tsconfig.build.json — see package.json.
    dts: false,
    sourcemap: true,
    clean: true,
});
