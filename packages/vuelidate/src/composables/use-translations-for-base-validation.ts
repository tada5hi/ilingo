/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { computedAsync } from '@vueuse/core';
import { injectIlingo, injectLocale } from '@ilingo/vue';
import { isSyncUnavailableError } from 'ilingo';
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
     * Mirrors the async body exactly, including its `value || rule` fallback:
     * `Ilingo.getSync` reports a rule with no catalog entry as `undefined`
     * (fall back to the rule name, same as the async pass) and *throws*
     * `SyncUnavailableError` only when a store would need I/O — where falling
     * back would be wrong, because the async pass is about to resolve a real
     * message. In that case the whole seed is abandoned and the previous
     * behaviour applies: empty until the async pass lands.
     *
     * Any other throw is swallowed too. This runs on the component's
     * synchronous setup path, where an escaping error aborts the mount, and a
     * seed must never be able to make things worse than not seeding.
     */
    const seed = () : Record<string, string> | undefined => {
        const output : Record<string, string> = {};

        for (let i = 0; i < rules.value.length; i++) {
            const rule = rules.value[i];
            const ruleResult = (result as Record<string, any>)[rule];

            let value : string | undefined;
            try {
                value = instance.getSync({
                    namespace: NAMESPACE,
                    key: rule,
                    data: ruleResult.$params,
                    locale: locale.value,
                });
            } catch (e) {
                if (!isSyncUnavailableError(e)) {
                    // eslint-disable-next-line no-console
                    console.warn('[ilingo/vuelidate] synchronous message lookup failed', e);
                }

                return undefined;
            }

            output[rule] = value || rule;
        }

        return output;
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
