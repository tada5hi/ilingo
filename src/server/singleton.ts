/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { AbstractLanguage } from '../module';
import { LanguageOptions } from '../type';
import { Language } from './module';

const instances: Record<string, AbstractLanguage> = {};

export function useLanguage(options?: LanguageOptions, key?: string): AbstractLanguage {
    key = key || 'default';

    if (Object.prototype.hasOwnProperty.call(instances, key)) {
        return instances[key];
    }

    const instance = new Language(options);

    instances[key] = instance;

    return instance;
}
