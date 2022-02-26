/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { AbstractLanguage } from './module';
import { LanguageOptions } from './type';

export class Language extends AbstractLanguage {
    // eslint-disable-next-line no-useless-constructor,@typescript-eslint/no-useless-constructor
    constructor(options?: LanguageOptions) {
        super(options);
    }

    async loadFile(file: string, locale?: string) : Promise<Record<string, any>> {
        this.setIsLoaded(file, locale);
        return {};
    }

    loadFileSync(file: string, locale?: string) : Record<string, any> {
        this.setIsLoaded(file, locale);
        return {};
    }
}

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

export async function lang(
    input: string,
    args?: Record<string, any>,
    locale?: string,
) {
    return useLanguage()
        .get(input, args, locale);
}

export function langSync(
    input: string,
    args?: Record<string, any>,
    locale?: string,
) {
    return useLanguage()
        .getSync(input, args, locale);
}
