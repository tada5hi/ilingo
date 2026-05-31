/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Lines } from 'ilingo';

/**
 * Default English translations for the built-in validup `IssueCode`s.
 *
 * Keyed by `IssueCode` runtime value (e.g. `value_invalid`,
 * `one_of_failed`). Placeholders use ilingo's `{{name}}` syntax and are
 * substituted from the issue's `data` field — see the `IssueCode`
 * JSDoc in `validup/src/issue/constants.ts` for each code's documented
 * data contract.
 *
 * Extension codes (declared via TypeScript declaration merging on
 * `IssueDataByCode` or shipped by adapter authors) are NOT covered by
 * this default catalog — register your own translations alongside the
 * built-ins.
 */
export function useEnglishTranslation(): Lines {
    return {
        // Generic / structural
        value_invalid: 'The value is invalid',
        one_of_failed: 'None of the alternatives was successful',

        // Presence
        required: 'The value is required',

        // Type assertions
        alpha: 'The value must contain only letters',
        alpha_num: 'The value must be alphanumeric',
        numeric: 'The value must be numeric',
        integer: 'The value must be an integer',
        decimal: 'The value must be a decimal number',

        // Length
        min_length: 'The minimum length allowed is {{min}}',
        max_length: 'The maximum length allowed is {{max}}',

        // Numeric range
        min_value: 'The value must be greater than or equal to {{min}}',
        max_value: 'The value must be less than or equal to {{max}}',
        between: 'The value must be between {{min}} and {{max}}',

        // String format
        email: 'The value is not a valid email address',
        url: 'The value is not a valid URL',
        ip_address: 'The value is not a valid IP address',
        mac_address: 'The value is not a valid MAC address',
        uuid: 'The value is not a valid UUID',
        date: 'The value is not a valid date',
        pattern: 'The value does not match the expected pattern',
        json: 'The value is not valid JSON',
        base64: 'The value is not valid base64',
        strong_password: 'The value does not meet the password strength requirements',

        // Comparison
        same_as: 'The value must equal {{other}}',
    };
}
