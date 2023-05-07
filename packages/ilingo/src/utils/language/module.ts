/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { hasOwnProperty } from 'smob';
import codes from './data.json';

export function isISO639LanguageCode(input: string) {
    return hasOwnProperty(codes, input);
}

export function isBCP47LanguageCode(input: string) {
    const hyphenIndex = input.indexOf('-');
    if (hyphenIndex !== -1) {
        input = input.substring(0, hyphenIndex);
    }

    return isISO639LanguageCode(input);
}
