/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { computedAsync } from '@vueuse/core';
import { injectIlingo, injectLocale } from '@ilingo/vue';
import type { BaseValidation } from '@vuelidate/core';
import type { Ref } from 'vue';
import { computed } from 'vue';
import { injectPrefix } from './di';
import { isValidationRuleResult } from './utils';

export function useValidationMessages(
    result: BaseValidation,
) : Ref<Record<string, string>> {
    const rules = computed<string[]>(() => {
        const output : string[] = [];
        const keys = Object.keys(result);
        for (let i = 0; i < keys.length; i++) {
            const item = (result as Record<string, any>)[keys[i]];
            if (!item || !item.$invalid || !isValidationRuleResult(item)) {
                continue;
            }

            output.push(keys[i]);
        }

        return output;
    });

    const instance = injectIlingo();
    const locale = injectLocale();
    const prefix = injectPrefix();

    return computedAsync(async () => {
        const output : Record<string, string> = {};

        for (let i = 0; i < rules.value.length; i++) {
            const rule = rules.value[i];
            const ruleResult = (result as Record<string, any>)[rule];

            const value = await instance.get(
                `${prefix.value || 'vuelidate'}.${rule}`,
                ruleResult.$params,
                locale.value,
            );

            output[rule] = value || rule;
        }

        return output;
    }, {});
}
