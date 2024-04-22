/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Validation, ValidationArgs } from '@vuelidate/core';
import type { NestedValidationsTranslations } from '../types';
import { useTranslationsForBaseValidation } from './use-translations-for-base-validation';

export function useTranslationsForNestedValidations<
    V extends ValidationArgs = ValidationArgs,
    T = unknown,
>(validation: Validation<V, T>) : NestedValidationsTranslations<T> {
    const keys = Object.keys(validation);
    const output = {} as NestedValidationsTranslations<T>;
    for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        if (key.startsWith('$')) {
            continue;
        }

        output[key as keyof T] = useTranslationsForBaseValidation(validation[key as keyof Validation<V, T>]);
    }

    return output;
}
