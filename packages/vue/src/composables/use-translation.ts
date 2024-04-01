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

export function useTranslation(
    key: DotKey,
    data: Record<string, any> = {},
) : Ref<string> {
    const instance = injectIlingo();
    const locale = injectLocale();

    const text = ref('');

    const translating = ref(false);
    const translate = async () : Promise<void> => {
        if (translating.value) return;
        translating.value = true;

        try {
            const value = await instance.get(key, data, locale.value);
            text.value = value ?? key;
        } finally {
            translating.value = false;
        }
    };

    Promise.resolve()
        .then(() => translate());

    watch(locale, (val, oldValue) => {
        if (val !== oldValue) {
            Promise.resolve()
                .then(() => translate());
        }
    });

    return text;
}
