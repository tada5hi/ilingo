/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export type Lines = ValueOrNestedValue<string>;
export type ValueOrNestedValue<T> = {
    [key: string]: ValueOrNestedValue<T> | T
};

// default: Record<group, Record<locale, Lines>>
export type LanguageData = Record<string, Record<string, Lines>>;
