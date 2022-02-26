/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export type LocatorInfo = {
    path: string,
    fileName: string,
    fileExtension: '.js' | '.ts' | '.json' | string
};

export type LocatorOptions = {
    extensions: string[] | string,
    locale: string,
    paths: string | string[],
};
