/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { GetContext, IStore } from 'ilingo';
import type { MaybeRef } from 'vue';

export type Options = {
    store: IStore,
    locale?: string
};

export type DataMaybeRef = Record<string, MaybeRef<string | number>>;

export type GetContextReactive = Omit<GetContext, 'data'> & {
    data?: DataMaybeRef
};
