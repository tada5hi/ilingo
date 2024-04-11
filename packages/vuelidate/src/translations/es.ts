/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { LinesRecord } from 'ilingo';

export function useSpanishTranslation(): LinesRecord {
    return {
        alpha: 'El valor no es alfabético',
        alphaNum: 'El valor debe ser alfanumérico',
        and: 'El valor no coincide con todos los validadores proporcionados',
        between: 'El valor debe estar entre {{min}} y {{max}}',
        decimal: 'El valor debe ser decimal',
        email: 'El valor no es una dirección de correo electrónico válida',
        integer: 'El valor debe ser un número entero',
        ipAddress: 'El valor no es una dirección IP válida',
        macAddress: 'El valor no es una dirección MAC válida',
        maxLength: 'La longitud máxima permitida es {{max}}',
        maxValue: 'El valor debe ser menor que {{max}}',
        minLength: 'La longitud mínima permitida es {{min}}',
        minValue: 'El valor debe ser mayor que {{min}}',
        not: 'El valor no coincide con el validador proporcionado',
        numeric: 'El valor debe ser numérico',
        or: 'El valor no coincide con ninguno de los validadores proporcionados',
        required: 'El valor es requerido',
        requiredIf: 'El valor es requerido',
        requiredUnless: 'El valor es requerido',
        sameAs: 'Los valores de entrada no son iguales a {{otherName}}',
        url: 'El valor de entrada debe ser una URL válida',
    };
}
