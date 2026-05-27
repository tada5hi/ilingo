/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { LinesRecord } from 'ilingo';

/**
 * Default English translations for the built-in validup `IssueCode`s.
 *
 * Keyed by `IssueCode` runtime value (e.g. `value_invalid`,
 * `one_of_failed`). Placeholders use ilingo's `{{name}}` syntax and are
 * substituted from the issue's `params` field.
 *
 * Extension codes (declared via `IssueCodeRegistry` declaration merging on
 * the validup side) are NOT covered by this default catalog — register
 * your own translations alongside the built-ins.
 */
export function useEnglishTranslation(): LinesRecord {
    return {
        value_invalid: 'The value is invalid',
        one_of_failed: 'None of the alternatives was successful',
    };
}
