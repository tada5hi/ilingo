/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { LinesRecord } from 'ilingo';

export function useFrenchTranslation(): LinesRecord {
    return {
        // Generic / structural
        value_invalid: 'La valeur est invalide',
        one_of_failed: 'Aucune des alternatives n’a réussi',

        // Presence
        required: 'La valeur est requise',

        // Type assertions
        alpha: 'La valeur ne doit contenir que des lettres',
        alpha_num: 'La valeur doit être alphanumérique',
        numeric: 'La valeur doit être numérique',
        integer: 'La valeur doit être un entier',
        decimal: 'La valeur doit être un nombre décimal',

        // Length
        min_length: 'La longueur minimale autorisée est {{min}}',
        max_length: 'La longueur maximale autorisée est {{max}}',

        // Numeric range
        min_value: 'La valeur doit être supérieure ou égale à {{min}}',
        max_value: 'La valeur doit être inférieure ou égale à {{max}}',
        between: 'La valeur doit être comprise entre {{min}} et {{max}}',

        // String format
        email: 'La valeur n’est pas une adresse e-mail valide',
        url: 'La valeur n’est pas une URL valide',
        ip_address: 'La valeur n’est pas une adresse IP valide',
        mac_address: 'La valeur n’est pas une adresse MAC valide',
        uuid: 'La valeur n’est pas un UUID valide',
        date: 'La valeur n’est pas une date valide',
        pattern: 'La valeur ne correspond pas au motif attendu',
        json: 'La valeur n’est pas un JSON valide',
        base64: 'La valeur n’est pas une valeur base64 valide',
        strong_password: 'La valeur ne respecte pas les exigences de robustesse du mot de passe',

        // Comparison
        same_as: 'La valeur doit être égale à {{other}}',
    };
}
