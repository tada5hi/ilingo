/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import template from 'lodash/template';
import * as path from 'path';
import * as process from 'process';
import { LanguageCache, LanguageOptions } from './type';
import { isLanguageObject } from './utils';
import {locateFile, locateFileSync} from "./locator";

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

    setOptions(options: Partial<LanguageOptions>) {
        this.options = {
            ...this.options,
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

    async getLine(input: string, args: Record<string, any>) : Promise<string> {
        if (!input.includes('.')) {
            return this.formatMessage(input, args);
        }

        const [file, line] = this.parseLine(input);
        const locale = this.getLocale();

        if (
            typeof this.cache[locale][file] === 'undefined' ||
            typeof this.cache[locale][file][line] === 'undefined'
        ) {
            await this.load(file, locale);
        }

        return this.formatMessage(this.cache[locale][file][line] ?? line, args);
    }

    getLineSync(input: string, args: Record<string, any>) : string {
        if (!input.includes('.')) {
            return this.formatMessage(input, args);
        }

        const [file, line] = this.parseLine(input);
        const locale = this.getLocale();

        if (
            typeof this.cache[locale][file] === 'undefined' ||
            typeof this.cache[locale][file][line] === 'undefined'
        ) {
            this.loadSync(file, locale);
        }

        return this.formatMessage(this.cache[locale][file][line] ?? line, args);
    }

    // ----------------------------------------------------

    parseLine(line: string) : [string, string] {
        const file = line.substring(0, line.indexOf('.'));
        line = line.substring(file.length + 1);

        return [file, line];
    }

    // ----------------------------------------------------

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
            return {};
        }

        this.initCache(file, locale);
        this.setIsLoaded(file, locale);

        const locatorInfo = await locateFile(this.buildDirectoryPaths(), file);
        if(!locatorInfo) {
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
            return {};
        }

        this.initCache(file, locale);
        this.setIsLoaded(file, locale);

        const locatorInfo = locateFileSync(this.buildDirectoryPaths(), file);
        if(!locatorInfo) {
            return {};
        }

        // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require,import/no-dynamic-require
        let { default: lang } = require(path.join(locatorInfo.path, locatorInfo.fileName));
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

    private buildDirectoryPaths() {
        let paths : string[];

        if(this.options.directory) {
            paths = Array.isArray(this.options.directory) ? this.options.directory : [this.options.directory];
        } else {
            paths = [
                path.join(process.cwd(), 'language')
            ];
        }

        return paths;
    }
}
