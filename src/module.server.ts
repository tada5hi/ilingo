/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { AbstractLanguage } from './module';
import { locateFile, locateFileSync } from './locator';
import { hasOwnProperty, isLanguageObject } from './utils';
import { LanguageOptions } from './type';

export class Language extends AbstractLanguage {
    // eslint-disable-next-line no-useless-constructor,@typescript-eslint/no-useless-constructor
    constructor(options?: LanguageOptions) {
        super(options);
    }

    async loadFile(file: string, locale?: string) : Promise<Record<string, any>> {
        locale ??= this.getLocale();

        // only load file once
        if (this.isLoaded(file, locale)) {
            /* istanbul ignore next */
            return {};
        }

        this.initFileCache(file, locale);
        this.setIsLoaded(file, locale);

        const locatorInfo = await locateFile(file, {
            locale,
            paths: this.directories,
        });

        if (!locatorInfo) {
            return {};
        }

        let { default: lang } = await import(locatorInfo.filePath);
        lang = isLanguageObject(lang) ? lang : {};
        this.cache[locale][file] = lang;

        return this.cache[locale][file];
    }

    loadFileSync(file: string, locale?: string) : Record<string, any> {
        locale ??= this.getLocale();

        if (this.isLoaded(file, locale)) {
            /* istanbul ignore next */
            return {};
        }

        this.initFileCache(file, locale);
        this.setIsLoaded(file, locale);

        const locatorInfo = locateFileSync(file, {
            locale,
            paths: this.directories,
        });

        if (!locatorInfo) {
            return {};
        }

        // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require,import/no-dynamic-require
        let lang = require(locatorInfo.filePath);
        if (hasOwnProperty(lang, 'default')) {
            lang = lang.default;
        }

        lang = isLanguageObject(lang) ? lang : {};
        this.cache[locale][file] = lang;

        return undefined;
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
