/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { RuleResultWithParams } from '@vuelidate/core';

export type ValidationRuleResult = Omit<RuleResultWithParams, '$params'> & {
    $params?: RuleResultWithParams['$params']
};
