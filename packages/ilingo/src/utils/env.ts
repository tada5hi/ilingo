/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

/**
 * `true` when running under a production bundle.
 *
 * Webpack's DefinePlugin and Vite's `define` replace the literal expression
 * `process.env.NODE_ENV` at build time. We reference it directly (rather
 * than via `globalThis`) so that replacement actually fires. The
 * `typeof process !== 'undefined'` guard makes raw-browser execution
 * (no polyfill, no bundler) safe.
 */
export function isProductionEnv(): boolean {
    try {
        return typeof process !== 'undefined' &&
            process.env != null &&
            process.env.NODE_ENV === 'production';
    } catch {
        return false;
    }
}
