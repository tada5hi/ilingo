/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { LinesRecord } from 'ilingo';

export function useEnglishTranslation(): LinesRecord {
    return {
        alpha: 'The value is not alphabetical',
        alphaNum: 'The value must be alpha-numeric',
        and: 'The value does not match all of the provided validators',
        between: 'The value must be between {{min}} and {{max}}',
        decimal: 'The value must be a decimal',
        email: 'The value is not a valid email address',
        integer: 'The value must be an integer',
        ipAddress: 'The value is not a valid IP address',
        macAddress: 'The value is not a valid MAC address',
        maxLength: 'The maximum length allowed is {{max}}',
        maxValue: 'The value must be less than {{max}} value',
        minLength: 'The minimum length allowed is {{min}}',
        minValue: 'The value must be greater than {{min}} value',
        not: 'The value does not match the provided validator',
        numeric: 'The value must be numeric',
        or: 'The value does not match any of the provided validators',
        required: 'The value is required',
        requiredIf: 'The value is required',
        requiredUnless: 'The value is required',
        sameAs: 'The input values is not equal to {{otherName}}',
        url: 'The input value must be a valid URL',
    };
}
