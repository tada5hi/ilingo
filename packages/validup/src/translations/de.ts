/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { LinesRecord } from 'ilingo';

export function useGermanTranslation(): LinesRecord {
    return {
        value_invalid: 'Der Wert ist ungültig',
        one_of_failed: 'Keine der Alternativen war erfolgreich',
    };
}
