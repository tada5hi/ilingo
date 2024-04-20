/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { computedAsync } from '@vueuse/core';
import type { GetInputParsed } from 'ilingo';
import type { Ref } from 'vue';
import { injectIlingo } from './instance';
import { injectLocale } from './locale';

export function useTranslation(ctx: GetInputParsed) : Ref<string> {
    const instance = injectIlingo();
    const locale = injectLocale();

    const defaultValue = `${ctx.group}.${ctx.key}`;

    return computedAsync(
        async () => {
            if (typeof ctx.locale === 'undefined') {
                ctx.locale = locale.value;
            }
            const value = await instance.get(ctx);
            return value || defaultValue;
        },
        defaultValue,
    );
}
