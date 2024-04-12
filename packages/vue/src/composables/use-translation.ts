/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { computedAsync } from '@vueuse/core';
import type { Ref } from 'vue';
import { injectIlingo } from './instance';
import { injectLocale } from './locale';

export function useTranslation(
    group: string,
    key: string,
    data: Record<string, any> = {},
) : Ref<string> {
    const instance = injectIlingo();
    const locale = injectLocale();

    return computedAsync(
        async () => {
            const value = await instance.get({
                group,
                key,
                data,
                locale: locale.value,
            });
            return value || key;
        },
        '',
    );
}
