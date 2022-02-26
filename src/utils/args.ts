/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export function parseArgsToDataAndLocale(
    data?: Record<string, any> | string,
    locale?: string,
    alt?: {data?: Record<string, any>, locale?: string},
) : [Record<string, any> | undefined, string | undefined] {
    alt = alt || {};
    alt.data = alt.data || {};
    alt.locale = alt.locale || 'en';

    if (typeof data === 'string') {
        return [{}, data];
    }

    return [
        data || alt.data,
        locale || alt.locale,
    ];
}
