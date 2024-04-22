/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { BaseValidation } from '@vuelidate/core';
import type { ComputedRef, MaybeRef } from 'vue';
import { computed, unref } from 'vue';
import type { Severity } from '../constants';
import { getSeverity } from '../helpers';

export function useSeverity(
    input: MaybeRef<BaseValidation>,
) : ComputedRef<`${Severity}` | undefined> {
    return computed(() => {
        const validation = unref(input);

        return getSeverity(validation);
    });
}
