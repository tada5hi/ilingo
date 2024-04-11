/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { LinesRecord } from 'ilingo';

export function useGermanTranslation(): LinesRecord {
    return {
        alpha: 'Der Wert ist nicht alphabetisch',
        alphaNum: 'Der Wert muss alphanumerisch sein',
        and: 'Der Wert entspricht nicht allen bereitgestellten Validatoren',
        between: 'Der Wert muss zwischen {{min}} und {{max}} liegen',
        decimal: 'Der Wert muss eine Dezimalzahl sein',
        email: 'Der Wert ist keine gültige E-Mail-Adresse',
        integer: 'Der Wert muss eine ganze Zahl sein',
        ipAddress: 'Der Wert ist keine gültige IP-Adresse',
        macAddress: 'Der Wert ist keine gültige MAC-Adresse',
        maxLength: 'Die maximale Länge beträgt {{max}}',
        maxValue: 'Der Wert muss kleiner als {{max}} sein',
        minLength: 'Die minimale Länge beträgt {{min}}',
        minValue: 'Der Wert muss größer als {{min}} sein',
        not: 'Der Wert entspricht nicht dem bereitgestellten Validator',
        numeric: 'Der Wert muss numerisch sein',
        or: 'Der Wert entspricht keinem der bereitgestellten Validatoren',
        required: 'Der Wert ist erforderlich',
        requiredIf: 'Der Wert ist erforderlich',
        requiredUnless: 'Der Wert ist erforderlich',
        sameAs: 'Die Eingabewerte sind nicht gleich {{otherName}}',
        url: 'Der Eingabewert muss eine gültige URL sein',
    };
}
