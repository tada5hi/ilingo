import config from '@tada5hi/eslint-config';

export default [
    ...await config({
        typescript: true,
        vue: true,
    }),
    {
        ignores: [
            '**/dist/**',
            '**/node_modules/**',
            '**/playground/**',
            '**/test/**',
            '**/*.d.ts',
            'docs/**',
            'packages/fs/core/**',
            'packages/vue/core/**',
            'packages/vuelidate/core/**',
            'packages/vuelidate/vue/**',
        ],
    },
];
