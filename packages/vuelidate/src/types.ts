/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { RuleResultWithParams } from '@vuelidate/core';
import type { Ref } from 'vue';
import type { Severity } from './constants';

export type RuleResult = Omit<RuleResultWithParams, '$params'> & {
    $params?: RuleResultWithParams['$params']
};

export type BaseValidationTranslations = Ref<Record<string, string>>;
export type NestedValidationsTranslations<T = unknown> = Record<keyof T, BaseValidationTranslations>;

export type KeyValue<T = any> = {
    key: string,
    value: T
};
export type SlotProps = {
    severity?: `${Severity}`,
    data: KeyValue<string>[]
};
