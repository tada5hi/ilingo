/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { useIlingo } from './singleton';
import type { GetInputParsed } from './types';

export async function lang(ctx: GetInputParsed): Promise<string | undefined> {
    return useIlingo().get(ctx);
}
