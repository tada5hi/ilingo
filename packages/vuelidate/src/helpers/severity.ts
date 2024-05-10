/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { BaseValidation, ValidationRuleCollection } from '@vuelidate/core';
import { Severity } from '../constants';

export function getSeverity<
    T = unknown,
    V extends ValidationRuleCollection<T> = ValidationRuleCollection<T>,
>(validation: BaseValidation<T, V>) : `${Severity}` | undefined {
    if (validation && validation.$invalid) {
        if (validation.$dirty) {
            return Severity.ERROR;
        }

        return Severity.WARNING;
    }

    return undefined;
}
