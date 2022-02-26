/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Language } from './module';
import { LanguageOptions } from './type';

let instance : Language | undefined;

export function useLanguage(options?: LanguageOptions) {
    if (typeof instance !== 'undefined') {
        return instance;
    }

    instance = new Language(options);

    return instance;
}
