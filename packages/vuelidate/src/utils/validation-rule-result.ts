/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { isObject } from './object';
import { hasOwnProperty } from './has-own-property';
import type { ValidationRuleResult } from '../types';

export function isValidationRuleResult(input: unknown) : input is ValidationRuleResult {
    return isObject(input) &&
        hasOwnProperty(input, '$message') &&
        hasOwnProperty(input, '$pending') &&
        hasOwnProperty(input, '$invalid') &&
        hasOwnProperty(input, '$response');
}
