/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { defineTranslations } from 'ilingo';

export default defineTranslations({
    // Generic / structural
    value_invalid: 'Der Wert ist ungültig',
    one_of_failed: 'Keine der Alternativen war erfolgreich',

    // Presence
    required: 'Der Wert ist erforderlich',

    // Type assertions
    alpha: 'Der Wert darf nur Buchstaben enthalten',
    alpha_num: 'Der Wert muss alphanumerisch sein',
    numeric: 'Der Wert muss numerisch sein',
    integer: 'Der Wert muss eine ganze Zahl sein',
    decimal: 'Der Wert muss eine Dezimalzahl sein',

    // Length
    min_length: 'Die minimale Länge beträgt {{min}}',
    max_length: 'Die maximale Länge beträgt {{max}}',

    // Numeric range
    min_value: 'Der Wert muss größer oder gleich {{min}} sein',
    max_value: 'Der Wert muss kleiner oder gleich {{max}} sein',
    between: 'Der Wert muss zwischen {{min}} und {{max}} liegen',

    // String format
    email: 'Der Wert ist keine gültige E-Mail-Adresse',
    url: 'Der Wert ist keine gültige URL',
    ip_address: 'Der Wert ist keine gültige IP-Adresse',
    mac_address: 'Der Wert ist keine gültige MAC-Adresse',
    uuid: 'Der Wert ist keine gültige UUID',
    date: 'Der Wert ist kein gültiges Datum',
    pattern: 'Der Wert entspricht nicht dem erwarteten Muster',
    json: 'Der Wert ist kein gültiges JSON',
    base64: 'Der Wert ist kein gültiges Base64',
    strong_password: 'Der Wert erfüllt nicht die Anforderungen an die Passwortstärke',

    // Comparison
    same_as: 'Der Wert muss gleich {{other}} sein',
});
