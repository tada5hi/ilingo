/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import resolve from '@rollup/plugin-node-resolve';
import { transform } from '@swc/core';
import pkg from './package.json' assert { type: "json" };
import json from "@rollup/plugin-json";

const extensions = [
    '.js', '.cjs', '.mjs', '.jsx', '.ts', '.tsx',
];

export default [
    {
        input: './src/index.ts',

        // Specify here external modules which you don't want to include in your bundle (for instance: 'lodash', 'moment' etc.)
        // https://rollupjs.org/guide/en/#external
        external: [
            ...Object.keys(pkg.dependencies || {}),
            ...Object.keys(pkg.peerDependencies || {}),
        ],

        plugins: [
            // Allows node_modules resolution
            resolve({ extensions}),

            json(),

            // Compile TypeScript/JavaScript files
            {
                name: 'swc',
                transform(code) {
                    return transform(code, {
                        jsc: {
                            target: 'es2020',
                            parser: {
                                syntax: 'typescript'
                            },
                            loose: true
                        },
                        sourceMaps: true
                    });
                }
            },
        ],

        output: [
            {
                file: pkg.main,
                format: 'cjs',
                sourcemap: true
            }, {
                file: pkg.module,
                format: 'esm',
                sourcemap: true
            }
        ],
    },
    {
        input: './src/store/fs.ts',

        // Specify here external modules which you don't want to include in your bundle (for instance: 'lodash', 'moment' etc.)
        // https://rollupjs.org/guide/en/#external
        external: [
            ...Object.keys(pkg.dependencies || {}),
            ...Object.keys(pkg.peerDependencies || {}),
        ],

        plugins: [
            // Allows node_modules resolution
            resolve({ extensions }),

            json(),

            // Compile TypeScript/JavaScript files
            {
                name: 'swc',
                transform(code) {
                    return transform(code, {
                        jsc: {
                            target: 'es2020',
                            parser: {
                                syntax: 'typescript'
                            },
                            loose: true
                        },
                        sourceMaps: true
                    });
                }
            },
        ],
        output: [
            {
                file: pkg.exports["./fs"].require,
                format: 'cjs',
                sourcemap: true
            }, {
                file: pkg.exports["./fs"].import,
                format: 'esm',
                sourcemap: true
            }
        ]
    }
];
