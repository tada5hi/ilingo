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
    locale?: string,
    /**
     * When `false`, the `v-t` directive is NOT registered globally on the
     * Vue app. Useful for apps that prefer the explicit `<ITranslate>` /
     * `<ITranslateT>` components, or that already use `v-t` for something
     * else. Default: `true`.
     */
    directives?: boolean,
};

export type DataMaybeRef = Record<string, MaybeRef<string | number>>;

export type GetContextReactive = Omit<GetContext, 'data' | 'count'> & {
    data?: DataMaybeRef,
    count?: MaybeRef<number>,
};
