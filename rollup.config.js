/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';
import babel from '@rollup/plugin-babel';
import pkg from './package.json';

const extensions = [
    '.js', '.jsx', '.ts', '.tsx',
];

const name = 'Ilingo';
const external = [
    'path',
    'fs'
];

export default [
    {
        input: './src/index.server.ts',

        // Specify here external modules which you don't want to include in your bundle (for instance: 'lodash', 'moment' etc.)
        // https://rollupjs.org/guide/en/#external
        external,

        plugins: [
            // Allows node_modules resolution
            resolve({ extensions}),

            // Allow bundling cjs modules. Rollup doesn't understand cjs
            commonjs(),

            // Compile TypeScript/JavaScript files
            babel({
                extensions,
                babelHelpers: 'runtime',
                include: [
                    'src/**/*',
                    '!src/index.client.ts',
                    '!src/client/**/*'
                ],
            }),
        ],

        output: [
            {
                file: pkg.main,
                format: 'cjs'
            }, {
                file: pkg.module,
                format: 'esm'
            }
        ],
    },
    {
        input: './src/index.ts',

        // Specify here external modules which you don't want to include in your bundle (for instance: 'lodash', 'moment' etc.)
        // https://rollupjs.org/guide/en/#external
        external: [],

        plugins: [
            // Allows node_modules resolution
            resolve({ extensions}),

            // Allow bundling cjs modules. Rollup doesn't understand cjs
            commonjs(),

            // Compile TypeScript/JavaScript files
            babel({
                extensions,
                babelHelpers: 'runtime',
                include: [
                    'src/**/*',
                    '!src/index.server.ts',
                    '!src/server/**/*',
                    '!src/loader/**/*',
                    '!src/locator/**/*'
                ],
            }),
        ],
        output: [
            {
                file: pkg.browser,
                format: 'esm',
            },
            {
                file: pkg.unpkg,
                format: 'iife',
                name,

                // https://rollupjs.org/guide/en/#outputglobals
                globals: {

                },
            }
        ]
    }
];
