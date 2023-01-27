/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import lodash from 'lodash';
import { IlingoOptions, LanguageCache, Lines } from './type';
import { isLineRecord, parseArgsToDataAndLocale, toArray } from './utils';

export abstract class AbstractIlingo {
    cache : LanguageCache = {};

    loaded : Record<string, string[]> = {};

    directories: string[];

    locale: string;

    // ----------------------------------------------------

    protected constructor(options?: IlingoOptions) {
        options = options || {};

        this.directories = options.directory ?
            toArray(options.directory) :
            [];

        this.locale = options.locale || 'en';

        if (options.cache) {
            this.setCache(options.cache);
        }
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
        value: string | Lines,
        locale?: string,
    ) {
        const [group, line] = this.parse(key);
        locale = locale || this.getLocale();

        this.initLines(group, locale);

        this.cache[locale][group][line] = value;
    }

    // ----------------------------------------------------

    async get(
        input: string,
        dataOrLocale?: Record<string, any> | string,
        locale?: string,
    ) : Promise<string> {
        const parsed = parseArgsToDataAndLocale(
            dataOrLocale,
            locale,
            { locale: this.getLocale() },
        );

        if (!input.includes('.')) {
            return this.formatMessage(input, parsed[0] || {});
        }

        const [file, line] = this.parse(input);

        if (
            !parsed[1] ||
            typeof this.cache[parsed[1]] === 'undefined' ||
            typeof this.cache[parsed[1]][file] === 'undefined'
        ) {
            await this.loadGroup(file, parsed[1]);
        }

        const message = this.getMessage(file, line, parsed[1]);

        return this.formatMessage(message || line, parsed[0] || {});
    }

    getSync(
        input: string,
        dataOrLocale?: Record<string, any> | string,
        locale?: string,
    ) : string {
        const parsed = parseArgsToDataAndLocale(
            dataOrLocale,
            locale,
            { locale: this.getLocale() },
        );

        if (!input.includes('.')) {
            return this.formatMessage(input, parsed[0] || {});
        }

        const [group, line] = this.parse(input);

        if (
            !parsed[1] ||
            typeof this.cache[parsed[1]] === 'undefined' ||
            typeof this.cache[parsed[1]][group] === 'undefined'
        ) {
            this.loadGroupSync(group, parsed[1]);
        }

        const message = this.getMessage(group, line, parsed[1]);

        return this.formatMessage(message || line, parsed[0] || {});
    }

    // ----------------------------------------------------

    parse(key: string) : [string, string] {
        const group = key.substring(0, key.indexOf('.'));
        const line = key.substring(group.length + 1);

        return [group, line];
    }

    // ----------------------------------------------------

    getMessage(group: string, line: string, locale?: string) : string | undefined {
        locale = locale || this.getLocale();

        if (
            typeof this.cache[locale] === 'undefined' ||
            typeof this.cache[locale][group] === 'undefined'
        ) {
            return undefined;
        }

        if (typeof this.cache[locale][group][line] === 'string') {
            return this.cache[locale][group][line] as string;
        }

        let current : unknown;
        let output : unknown;

        const parts = line.split('.');
        for (let i = 0; i < parts.length; i++) {
            if (typeof current === 'undefined') {
                current = this.cache[locale][group];
            }

            output = isLineRecord(current) ? current[parts[i]] : undefined;
            if (typeof output === 'string') {
                return output;
            }

            if (isLineRecord(output)) {
                current = output;
            }
        }

        return undefined;
    }

    formatMessage(message: string, args: Record<string, any>) : string {
        const compiled = lodash.template(message, {
            interpolate: /{{([\s\S]+?)}}/g,
        });

        return compiled(args);
    }

    // ---------------------------------------------------

    abstract loadGroup(group: string, locale?: string) : Promise<Record<string, any>>;

    abstract loadGroupSync(group: string, locale?: string) : Record<string, any>;

    // ------------------------------------------

    protected isLoaded(group: string, locale?: string) : boolean {
        locale = locale || this.getLocale();

        this.loaded[locale] = this.loaded[locale] || [];

        return this.loaded[locale].indexOf(group) !== -1;
    }

    protected setIsLoaded(group: string, locale?: string) {
        locale = locale || this.getLocale();

        this.loaded[locale] = this.loaded[locale] || [];

        this.loaded[locale].push(group);
    }

    protected resetIsLoaded() {
        this.loaded = {};
    }

    // ------------------------------------------

    protected initLines(group: string, locale?: string) {
        locale = locale || this.getLocale();

        if (typeof this.cache[locale] === 'undefined') {
            this.cache[locale] = {};
        }

        if (typeof this.cache[locale][group] === 'undefined') {
            this.cache[locale][group] = {};
        }
    }

    public setLines(
        group: string,
        lines: Lines,
        locale?: string,
    ) {
        locale = locale || this.getLocale();

        this.initLines(group, locale);

        this.cache[locale][group] = lines;
    }

    public addLines(
        group: string,
        lines: Lines,
        locale?: string,
    ) {
        locale = locale || this.getLocale();

        this.initLines(group, locale);

        this.cache[locale][group] = {
            ...this.cache[locale][group],
            ...lines,
        };
    }

    // ------------------------------------------

    public setCache(
        data: LanguageCache,
        extend = true,
    ) {
        if (!extend) {
            this.resetCache();
        }

        const localeKeys = Object.keys(data);
        for (let i = 0; i < localeKeys.length; i++) {
            const localeGroups = Object.keys(data[localeKeys[i]]);
            for (let j = 0; j < localeGroups.length; j++) {
                if (extend) {
                    this.addLines(localeGroups[j], data[localeKeys[i]][localeGroups[j]], localeKeys[i]);
                } else {
                    this.setLines(localeGroups[j], data[localeKeys[i]][localeGroups[j]], localeKeys[i]);
                }
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
