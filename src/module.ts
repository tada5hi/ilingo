/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import template from 'lodash/template';
import { LanguageCache, LanguageOptions } from './type';
import { isLanguageObject, toArray } from './utils';

export abstract class AbstractLanguage {
    cache : LanguageCache = {};

    loaded : Record<string, string[]> = {};

    directories: string[];

    locale: string;

    useFileSystem: boolean;

    // ----------------------------------------------------

    protected constructor(options?: LanguageOptions) {
        options = options || {};

        this.directories = options.directory ?
            toArray(options.directory) :
            [];

        this.locale = options.locale || 'en';

        if (options.cache) {
            this.setCache(options.cache);
        }

        this.useFileSystem = options.fs ?? true;
    }

    // ----------------------------------------------------

    setDirectory(
        directory: string | string[],
        extend = false,
    ) {
        this.directories = [
            ...(extend ? this.directories : []),
            ...toArray(directory),
        ];
    }

    getDirectory() : string | undefined {
        if (this.directories.length > 0) {
            return this.directories[0];
        }

        return undefined;
    }

    getDirectories() {
        return this.directories;
    }

    // ----------------------------------------------------

    setLocale(key: string) {
        this.locale = key;
    }

    getLocale() : string {
        return this.locale || 'en';
    }

    // ----------------------------------------------------

    set(
        key: string,
        value: any,
        locale?: string,
    ) {
        const [file, line] = this.parse(key);
        locale = locale ?? this.getLocale();

        this.initFileCache(file, locale);

        this.cache[locale][file][line] = value;
    }

    setGroup(
        key: string,
        value: unknown,
        locale?: string,
    ) {
        if (key.includes('.')) {
            // key is not a group ...
            return;
        }

        this.setFileCache(key, value, locale);
    }

    // ----------------------------------------------------

    async get(
        key: string,
        args?: Record<string, any>,
        locale?: string,
    ) : Promise<string> {
        args ??= {};

        if (!key.includes('.')) {
            return this.formatMessage(key, args);
        }

        const [file, line] = this.parse(key);
        locale = locale ?? this.getLocale();

        if (
            typeof this.cache[locale] === 'undefined' ||
            typeof this.cache[locale][file] === 'undefined'
        ) {
            await this.loadFile(file, locale);
        }

        const message = this.getMessage(file, line, locale);

        return this.formatMessage(message ?? line, args);
    }

    getSync(
        key: string,
        args?: Record<string, any>,
        locale?: string,
    ) : string {
        args ??= {};

        if (!key.includes('.')) {
            return this.formatMessage(key, args);
        }

        const [file, line] = this.parse(key);
        locale = locale ?? this.getLocale();

        if (
            typeof this.cache[locale] === 'undefined' ||
            typeof this.cache[locale][file] === 'undefined'
        ) {
            this.loadFileSync(file, locale);
        }

        const message = this.getMessage(file, line, locale);

        return this.formatMessage(message ?? line, args);
    }

    // ----------------------------------------------------

    parse(key: string) : [string, string] {
        const file = key.substring(0, key.indexOf('.'));
        const line = key.substring(file.length + 1);

        return [file, line];
    }

    // ----------------------------------------------------

    getMessage(file: string, line: string, locale?: string) : string | undefined {
        if (
            typeof this.cache[locale] === 'undefined' ||
            typeof this.cache[locale][file] === 'undefined'
        ) {
            return undefined;
        }

        locale ??= this.getLocale();

        if (typeof this.cache[locale][file][line] === 'string') {
            return this.cache[locale][file][line] as string;
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

    abstract loadFile(file: string, locale?: string) : Promise<Record<string, any>>;

    abstract loadFileSync(file: string, locale?: string) : Record<string, any>;

    // ------------------------------------------

    protected isLoaded(file: string, locale?: string) : boolean {
        locale ??= this.getLocale();

        this.loaded[locale] ??= [];

        return this.loaded[locale].indexOf(file) !== -1;
    }

    protected setIsLoaded(file: string, locale?: string) {
        locale ??= this.getLocale();

        this.loaded[locale] ??= [];

        this.loaded[locale].push(file);
    }

    protected resetIsLoaded() {
        this.loaded = {};
    }

    // ------------------------------------------

    protected initFileCache(file: string, locale?: string) {
        locale ??= this.getLocale();

        this.cache[locale] ??= {};
        this.cache[locale][file] ??= {};
    }

    protected setFileCache(
        file: string,
        value: unknown,
        locale?: string,
    ) {
        locale ??= this.getLocale();

        this.initFileCache(file, locale);

        if (isLanguageObject(value)) {
            this.cache[locale][file] = value;
        }
    }

    // ------------------------------------------

    public setCache(cache: LanguageCache, extend = true) {
        if (!extend) {
            this.resetCache();
        }

        const localeKeys = Object.keys(cache);
        for (let i = 0; i < localeKeys.length; i++) {
            const localeGroups = Object.keys(cache[localeKeys[i]]);
            for (let j = 0; j < localeGroups.length; j++) {
                this.setGroup(localeGroups[j], cache[localeKeys[i]][localeGroups[j]], localeKeys[i]);
            }
        }
    }

    public getCache() : LanguageCache {
        return this.cache;
    }

    public resetCache() {
        this.cache = {};
        this.resetIsLoaded();
    }
}
