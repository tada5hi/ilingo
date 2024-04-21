/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { computedAsync } from '@vueuse/core';
import type { Ref } from 'vue';
import type { GetContextReactive } from '../types';
import { extractReactiveData } from './utils';
import { injectIlingo } from './instance';
import { injectLocale } from './locale';

export function useTranslation(ctx: GetContextReactive) : Ref<string> {
    const instance = injectIlingo();
    const locale = injectLocale();

    const defaultValue = `${ctx.group}.${ctx.key}`;

    return computedAsync(
        async () => {
            const value = await instance.get({
                locale: ctx.locale ?
                    ctx.locale :
                    locale.value,
                data: ctx.data ?
                    extractReactiveData(ctx.data) :
                    undefined,
                group: ctx.group,
                key: ctx.key,
            });

            return value || defaultValue;
        },
        defaultValue,
    );
}
