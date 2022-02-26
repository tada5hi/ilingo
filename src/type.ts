/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export type LanguageCache = {
    [locale: string] : {
        [group: string]: {
            [line: string]: unknown
        }
    }
};

export type LanguageOptions = {
    // default: process.cw() + path.separator + 'languages';
    directory?: string | string[],
    // default: en
    locale?: string,
    // default: {}
    cache?: LanguageCache
};
