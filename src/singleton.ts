/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Language } from './module';
import { LanguageOptions } from './type';

const instances : Record<string, Language> = {};

export function useLanguage(options?: LanguageOptions, key?: string) : Language {
    key = key || 'default';

    if (Object.prototype.hasOwnProperty.call(instances, key)) {
        return instances[key];
    }

    const instance = new Language(options);

    instances[key] = instance;

    return instance;
}
