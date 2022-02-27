/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { useIlingo } from './singleton';

export async function lang(
    input: string,
    dataOrLocale?: Record<string, any> | string,
    locale?: string,
) {
    return useIlingo()
        .get(input, dataOrLocale, locale);
}

export function langSync(
    input: string,
    dataOrLocale?: Record<string, any> | string,
    locale?: string,
) {
    return useIlingo()
        .getSync(input, dataOrLocale, locale);
}
