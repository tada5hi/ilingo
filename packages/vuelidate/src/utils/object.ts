/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export function isObject(input: unknown) : input is Record<string, any> {
    return typeof input === 'object' &&
        input !== null &&
        !Array.isArray(input) &&
        !!input;
}
