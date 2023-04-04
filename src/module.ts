/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createMerger, isObject } from 'smob';
import type { Merger } from 'smob';
import { buildConfig } from './config';
import type { ConfigInput } from './config';
import type { LanguageData, Lines } from './type';
import {
    isLineRecord,
    parseArgsToDataAndLocale,
    template,
} from './utils';

export abstract class AbstractIlingo {
    protected data : LanguageData;

    protected loaded : Record<string, string[]>;

    protected directories: string[];

    protected locale: string;

    protected merger : Merger;

    // ----------------------------------------------------

    protected constructor(input?: ConfigInput) {
        const config = buildConfig(input);

        this.data = {};
        this.loaded = {};

        this.directories = config.directory;
        this.locale = config.locale;

        this.merger = createMerger({
            array: true,
            arrayDistinct: true,
        });

        this.setMany(config.data);
    }

    // ----------------------------------------------------

    applyConfig(config?: ConfigInput) {
        config = config || {};

        if (config.locale) {
            this.setLocale(config.locale);
        }

        if (config.directory) {
            this.setDirectory(config.directory);
        }

        if (config.data) {
            this.setMany(config.data);
        }
    }

    // ----------------------------------------------------

    setLocale(key: string) {
        this.locale = key;
    }

    getLocale() : string {
        return this.locale;
    }

    // ----------------------------------------------------

    setDirectory(input: string | string[]) {
        const directories = Array.isArray(input) ?
            input :
            [input];

        this.directories = [
            ...new Set([
                ...this.directories,
                ...directories,
            ]),
        ];

        this.resetIsLoaded();
    }

    getDirectory() : string[] {
        return this.directories;
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

        this.data[locale][group][line] = value;
    }

    public setMany(data: LanguageData) {
        const localeKeys = Object.keys(data);
        for (let i = 0; i < localeKeys.length; i++) {
            const localeGroups = Object.keys(data[localeKeys[i]]);
            for (let j = 0; j < localeGroups.length; j++) {
                this.setLines(localeGroups[j], data[localeKeys[i]][localeGroups[j]], localeKeys[i]);
            }
        }
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

        await this.loadGroup(file, parsed[1]);

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

        this.loadGroupSync(group, parsed[1]);

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
            typeof this.data[locale] === 'undefined' ||
            typeof this.data[locale][group] === 'undefined'
        ) {
            return undefined;
        }

        if (typeof this.data[locale][group][line] === 'string') {
            return this.data[locale][group][line] as string;
        }

        let current : unknown;
        let output : unknown;

        const parts = line.split('.');
        for (let i = 0; i < parts.length; i++) {
            if (typeof current === 'undefined') {
                current = this.data[locale][group];
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

    formatMessage(message: string, args?: Record<string, any>) : string {
        return template(message, args || {});
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

        if (typeof this.data[locale] === 'undefined') {
            this.data[locale] = {};
        }

        if (typeof this.data[locale][group] === 'undefined') {
            this.data[locale][group] = {};
        }
    }

    public setLines(
        group: string,
        lines: Lines,
        locale?: string,
    ) {
        locale = locale || this.getLocale();

        this.initLines(group, locale);

        this.data[locale][group] = this.merger(
            {},
            lines,
            this.data[locale][group],
        );
    }

    public resetLines(
        group: string,
        locale?: string,
    ) {
        locale = locale || this.getLocale();

        if (
            isObject(this.data[locale]) &&
            typeof this.data[locale][group] !== 'undefined'
        ) {
            delete this.data[locale][group];
        }
    }
}
