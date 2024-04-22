/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { computedAsync } from '@vueuse/core';
import { injectIlingo, injectLocale } from '@ilingo/vue';
import type { BaseValidation, ValidationRuleCollection } from '@vuelidate/core';
import { computed } from 'vue';
import type { BaseValidationTranslations } from '../types';
import { isRuleResult } from '../utils';

export function useTranslationsForBaseValidation<
    T = unknown,
    V extends ValidationRuleCollection<T> | undefined = undefined,
>(
    result: BaseValidation<T, V>,
) : BaseValidationTranslations {
    const rules = computed<string[]>(() => {
        const output : string[] = [];
        const keys = Object.keys(result);
        for (let i = 0; i < keys.length; i++) {
            const item = (result as Record<string, any>)[keys[i]];
            if (!item || !item.$invalid || !isRuleResult(item)) {
                continue;
            }

            output.push(keys[i]);
        }

        return output;
    });

    const instance = injectIlingo();
    const locale = injectLocale();

    return computedAsync(async () => {
        const output : Record<string, string> = {};

        for (let i = 0; i < rules.value.length; i++) {
            const rule = rules.value[i];
            const ruleResult = (result as Record<string, any>)[rule];

            const value = await instance.get({
                group: 'vuelidate',
                key: rule,
                data: ruleResult.$params,
                locale: locale.value,
            });

            output[rule] = value || rule;
        }

        return output;
    }, {});
}
