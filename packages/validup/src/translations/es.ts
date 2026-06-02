/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { defineTranslations } from 'ilingo';

export default defineTranslations({
    // Generic / structural
    value_invalid: 'El valor no es válido',
    one_of_failed: 'Ninguna de las alternativas tuvo éxito',

    // Presence
    required: 'El valor es obligatorio',

    // Type assertions
    alpha: 'El valor solo debe contener letras',
    alpha_num: 'El valor debe ser alfanumérico',
    numeric: 'El valor debe ser numérico',
    integer: 'El valor debe ser un número entero',
    decimal: 'El valor debe ser un número decimal',

    // Length
    min_length: 'La longitud mínima permitida es {{min}}',
    max_length: 'La longitud máxima permitida es {{max}}',

    // Numeric range
    min_value: 'El valor debe ser mayor o igual que {{min}}',
    max_value: 'El valor debe ser menor o igual que {{max}}',
    between: 'El valor debe estar entre {{min}} y {{max}}',

    // String format
    email: 'El valor no es una dirección de correo electrónico válida',
    url: 'El valor no es una URL válida',
    ip_address: 'El valor no es una dirección IP válida',
    mac_address: 'El valor no es una dirección MAC válida',
    uuid: 'El valor no es un UUID válido',
    date: 'El valor no es una fecha válida',
    pattern: 'El valor no coincide con el patrón esperado',
    json: 'El valor no es un JSON válido',
    base64: 'El valor no es una codificación base64 válida',
    strong_password: 'El valor no cumple los requisitos de seguridad de la contraseña',

    // Comparison
    same_as: 'El valor debe ser igual a {{other}}',
});
