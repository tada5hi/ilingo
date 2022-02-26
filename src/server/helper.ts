/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { useIlingo } from './singleton';

export async function lang(
    input: string,
    args?: Record<string, any>,
    locale?: string,
) {
    return useIlingo()
        .get(input, args, locale);
}

export function langSync(
    input: string,
    args?: Record<string, any>,
    locale?: string,
) {
    return useIlingo()
        .getSync(input, args, locale);
}
