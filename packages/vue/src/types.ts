/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { GetContext, Store } from 'ilingo';
import type { MaybeRef } from 'vue';

export type Options = {
    store: Store,
    locale?: string
};

export type DataMaybeRef = Record<string, MaybeRef<string | number>>;

export type GetContextReactive = Omit<GetContext, 'data'> & {
    data: DataMaybeRef
};
