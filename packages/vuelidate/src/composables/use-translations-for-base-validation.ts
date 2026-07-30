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
import { NAMESPACE } from '../constants';
import type { BaseValidationTranslations } from '../types';
import { isRuleResult } from '../utils';

export function useTranslationsForBaseValidation<
    T = unknown,
    V extends ValidationRuleCollection<T> = ValidationRuleCollection<T>,
>(
    result: BaseValidation<T, V>,
) : BaseValidationTranslations {
    const rules = computed<string[]>(() => {
        const output : string[] = [];
        const keys = Object.keys(result);
        for (const key of keys) {
            const item = (result as Record<string, any>)[key];
            if (!item || !item.$invalid || !isRuleResult(item)) {
                continue;
            }

            output.push(key);
        }

        return output;
    });

    const instance = injectIlingo();
    const locale = injectLocale();

    /**
     * Synchronous seed for the `computedAsync` below, so the first render
     * carries the messages instead of an empty record — no blink on mount,
     * and server-rendered markup the client reproduces exactly (#988).
     *
     * **All or nothing.** `Ilingo.getSync()` returns `undefined` both for a
     * rule that has no catalog entry (where the async path falls back to the
     * rule *name*) and for a store that needs I/O (where it resolves a real
     * message a tick later). Those want opposite fallbacks, so rather than
     * guess, a single unresolvable rule abandons the whole seed and the
     * previous behaviour — empty until the async pass lands — applies.
     *
     * Wrapped in a `try` because this runs on the component's synchronous
     * setup path: a throwing custom store or formatter would abort the mount,
     * where the same throw inside the `computedAsync` below is absorbed by its
     * `onError`. A seed must never be able to make things worse than not
     * seeding — the async pass re-runs the work and reports the failure.
     */
    const seed = () : Record<string, string> | undefined => {
        try {
            const output : Record<string, string> = {};

            for (let i = 0; i < rules.value.length; i++) {
                const rule = rules.value[i];
                const ruleResult = (result as Record<string, any>)[rule];

                const value = instance.getSync?.({
                    namespace: NAMESPACE,
                    key: rule,
                    data: ruleResult.$params,
                    locale: locale.value,
                });

                if (!value) {
                    return undefined;
                }

                output[rule] = value;
            }

            return output;
        } catch {
            return undefined;
        }
    };

    return computedAsync(async () => {
        const output : Record<string, string> = {};

        for (let i = 0; i < rules.value.length; i++) {
            const rule = rules.value[i];
            const ruleResult = (result as Record<string, any>)[rule];

            const value = await instance.get({
                namespace: NAMESPACE,
                key: rule,
                data: ruleResult.$params,
                locale: locale.value,
            });

            output[rule] = value || rule;
        }

        return output;
    }, seed() ?? {});
}
