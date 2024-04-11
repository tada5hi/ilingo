/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { LinesRecord } from 'ilingo';

export function useFrenchTranslation(): LinesRecord {
    return {
        alpha: 'La valeur n\'est pas alphabétique',
        alphaNum: 'La valeur doit être alphanumérique',
        and: 'La valeur ne correspond pas à tous les validateurs fournis',
        between: 'La valeur doit être entre {{min}} et {{max}}',
        decimal: 'La valeur doit être décimale',
        email: 'La valeur n\'est pas une adresse e-mail valide',
        integer: 'La valeur doit être un entier',
        ipAddress: 'La valeur n\'est pas une adresse IP valide',
        macAddress: 'La valeur n\'est pas une adresse MAC valide',
        maxLength: 'La longueur maximale autorisée est de {{max}}',
        maxValue: 'La valeur doit être inférieure à {{max}}',
        minLength: 'La longueur minimale autorisée est de {{min}}',
        minValue: 'La valeur doit être supérieure à {{min}}',
        not: 'La valeur ne correspond pas au validateur fourni',
        numeric: 'La valeur doit être numérique',
        or: 'La valeur ne correspond à aucun des validateurs fournis',
        required: 'La valeur est requise',
        requiredIf: 'La valeur est requise',
        requiredUnless: 'La valeur est requise',
        sameAs: 'Les valeurs d\'entrée ne sont pas égales à {{otherName}}',
        url: 'La valeur d\'entrée doit être une URL valide',
    };
}
