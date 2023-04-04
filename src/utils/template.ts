/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export const template = (
    str: string,
    data: Record<string, any>,
    regex = /\{\{(.+?)\}\}/g,
) : string => Array.from(str.matchAll(regex))
    .reduce((
        acc,
        match,
    ) => acc.replace(match[0], data[match[1]]), str);
