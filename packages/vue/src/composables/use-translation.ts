/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { DotKey } from 'ilingo';
import type { Ref } from 'vue';
import { ref, watch } from 'vue';
import { injectIlingo } from './instance';
import { injectLocale } from './locale';

export function useTranslation(key: DotKey, data?: Record<string, any>) : Ref<string> {
    const instance = injectIlingo();
    const locale = injectLocale();

    const text = ref('');

    const translate = () : string => {
        const value = instance.getSync(key, data, locale.value);
        return value ?? key;
    };

    text.value = translate();

    watch(locale, (val, oldValue) => {
        if (val !== oldValue) {
            text.value = translate();
        }
    });

    return text;
}
