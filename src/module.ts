/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import template from 'lodash/template';
import * as path from 'path';
import { LanguageCache, LanguageOptions } from './type';
import { hasOwnProperty, isLanguageObject } from './utils';
import { locateFile, locateFileSync } from './locator';

export class Language {
    cache : LanguageCache = {};

    loaded : Record<string, string[]> = {};

    options : LanguageOptions;

    // ----------------------------------------------------

    constructor(options?: LanguageOptions) {
        options = options || {};

        this.options = options;
    }

    // ----------------------------------------------------

    setOptions(
        options: Partial<LanguageOptions>,
        extend = true,
    ) {
        this.options = {
            ...(extend ? this.options : {}),
            ...options,
        };
    }

    getOptions() {
        return this.options;
    }

    // ----------------------------------------------------

    getLocale() : string {
        return this.options.locale || 'en';
    }

    // ----------------------------------------------------

    async getLine(
        key: string,
        args?: Record<string, any>,
        locale?: string,
    ) : Promise<string> {
        args ??= {};

        if (!key.includes('.')) {
            return this.formatMessage(key, args);
        }

        const [file, line] = this.parseLine(key);
        locale = locale ?? this.getLocale();

        if (
            typeof this.cache[locale] === 'undefined' ||
            typeof this.cache[locale][file] === 'undefined'
        ) {
            await this.load(file, locale);
        }

        const message = this.getMessage(file, line, locale);

        return this.formatMessage(message ?? line, args);
    }

    getLineSync(
        key: string,
        args?: Record<string, any>,
        locale?: string,
    ) : string {
        args ??= {};

        if (!key.includes('.')) {
            return this.formatMessage(key, args);
        }

        const [file, line] = this.parseLine(key);
        locale = locale ?? this.getLocale();

        if (
            typeof this.cache[locale] === 'undefined' ||
            typeof this.cache[locale][file] === 'undefined'
        ) {
            this.loadSync(file, locale);
        }

        const message = this.getMessage(file, line, locale);

        return this.formatMessage(message ?? line, args);
    }

    // ----------------------------------------------------

    setLine(
        key: string,
        value: any,
        locale?: string,
    ) {
        const [file, line] = this.parseLine(key);
        locale = locale ?? this.getLocale();

        this.initCache(file, locale);

        this.cache[locale][file][line] = value;
    }

    parseLine(key: string) : [string, string] {
        const file = key.substring(0, key.indexOf('.'));
        const line = key.substring(file.length + 1);

        return [file, line];
    }

    // ----------------------------------------------------

    getMessage(file: string, line: string, locale?: string) : string | undefined {
        locale ??= this.getLocale();

        if (typeof this.cache[locale][file][line] === 'string') {
            return this.cache[locale][file][line];
        }

        let current : unknown;
        let output : unknown;

        const parts = line.split('.');
        for (let i = 0; i < parts.length; i++) {
            if (typeof current === 'undefined') {
                current = this.cache[locale][file];
            }

            output = isLanguageObject(current) ? current[parts[i]] : undefined;
            if (typeof output === 'string') {
                return output;
            }

            if (isLanguageObject(output)) {
                current = output;
            }
        }

        return undefined;
    }

    formatMessage(message: string, args: Record<string, any>) : string {
        const compiled = template(message, {
            interpolate: /{{([\s\S]+?)}}/g,
        });

        return compiled(args);
    }

    // ---------------------------------------------------

    async load(file: string, locale?: string) : Promise<Record<string, any>> {
        locale ??= this.getLocale();

        // only load file once
        if (this.isLoaded(file, locale)) {
            /* istanbul ignore next */
            return {};
        }

        this.initCache(file, locale);
        this.setIsLoaded(file, locale);

        const locatorInfo = await locateFile(this.buildDirectoryPaths(locale), file);
        if (!locatorInfo) {
            return {};
        }

        let { default: lang } = await import(path.join(locatorInfo.path, locatorInfo.fileName));
        lang = isLanguageObject(lang) ? lang : {};
        this.cache[locale][file] = lang;

        return this.cache[locale][file];
    }

    loadSync(file: string, locale?: string) : Record<string, any> {
        locale ??= this.getLocale();

        if (this.isLoaded(file, locale)) {
            /* istanbul ignore next */
            return {};
        }

        this.initCache(file, locale);
        this.setIsLoaded(file, locale);

        const locatorInfo = locateFileSync(this.buildDirectoryPaths(locale), file);
        if (!locatorInfo) {
            return {};
        }

        // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require,import/no-dynamic-require
        let lang = require(path.join(locatorInfo.path, locatorInfo.fileName));
        if (hasOwnProperty(lang, 'default')) {
            lang = lang.default;
        }

        lang = isLanguageObject(lang) ? lang : {};
        this.cache[locale][file] = lang;

        return this.cache[locale][file];
    }

    // ------------------------------------------

    private isLoaded(file: string, locale?: string) : boolean {
        locale ??= this.getLocale();

        this.loaded[locale] ??= [];

        return this.loaded[locale].indexOf(file) !== -1;
    }

    private setIsLoaded(file: string, locale?: string) {
        locale ??= this.getLocale();

        this.loaded[locale] ??= [];

        this.loaded[locale].push(file);
    }

    private initCache(file: string, locale?: string) {
        locale ??= this.getLocale();

        this.cache[locale] ??= {};
        this.cache[locale][file] ??= {};
    }

    // --------------------------------------------------------

    private buildDirectoryPaths(locale?: string) {
        locale ??= this.getLocale();

        let paths : string[];

        if (this.options.directory) {
            paths = Array.isArray(this.options.directory) ? this.options.directory : [this.options.directory];
        } else {
            /* istanbul ignore next */
            paths = [
                path.join(process.cwd(), 'language'),
            ];
        }

        return paths.map((item) => path.join(item, locale));
    }
}
