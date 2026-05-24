/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export type Config = {
    directory: string[],
    writeDirectory: string,
    /**
     * When `true`, watch the configured `directory` paths via `chokidar`
     * and invalidate the matching `(locale, group)` cache entry on each
     * change. Subscribers registered via `FSStore.on('invalidate', ...)`
     * are notified.
     *
     * Default `false`. `chokidar` is an *optional* peer dependency — install
     * it (`npm i chokidar -D`) when enabling this option.
     */
    watch: boolean,
};

export type ConfigInput = {
    directory?: string | string[],
    writeDirectory?: string,
    watch?: boolean,
};
