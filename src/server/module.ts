/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { LocatorOptions } from 'locter';
import {
    getModuleExport,
    load,
    loadSync,
    locate,
    locateSync,
} from 'locter';
import path from 'path';
import type { ConfigInput } from '../config';
import { AbstractIlingo } from '../module';
import { isLineRecord } from '../utils';

export class Ilingo extends AbstractIlingo {
    // eslint-disable-next-line no-useless-constructor,@typescript-eslint/no-useless-constructor
    constructor(config?: ConfigInput) {
        super(config);
    }

    async loadGroup(file: string, locale?: string) : Promise<Record<string, any>> {
        locale = locale || this.getLocale();

        // only load file once
        if (this.isLoaded(file, locale)) {
            /* istanbul ignore next */
            return {};
        }

        this.initLines(file, locale);
        this.setIsLoaded(file, locale);

        const locatorInfo = await locate(
            this.addExtensionPattern(file),
            this.buildLocatorOptions(locale),
        );

        if (!locatorInfo) {
            return {};
        }

        const fileContent = await load(locatorInfo);
        const { value: data } = getModuleExport(fileContent);

        this.cache[locale][file] = isLineRecord(data) ? data : {};

        return this.cache[locale][file];
    }

    loadGroupSync(file: string, locale?: string) : Record<string, any> {
        locale = locale || this.getLocale();

        if (this.isLoaded(file, locale)) {
            /* istanbul ignore next */
            return {};
        }

        this.initLines(file, locale);
        this.setIsLoaded(file, locale);

        const locatorInfo = locateSync(
            this.addExtensionPattern(file),
            this.buildLocatorOptions(locale),
        );

        if (!locatorInfo) {
            return {};
        }

        const fileContent = loadSync(locatorInfo);
        const { value: data } = getModuleExport(fileContent);

        this.cache[locale][file] = isLineRecord(data) ? data : {};

        return this.cache[locale][file];
    }

    protected buildLocatorOptions(locale?: string) : LocatorOptions {
        let directory: string[];
        if (this.directories.length === 0) {
            directory = [locale || 'en'];
        } else {
            directory = this.directories.map(
                (directory) => path.join(directory, locale || 'en'),
            );
        }

        return {
            path: directory,
            ignore: [],
        };
    }

    protected addExtensionPattern(name: string) {
        return `${name}.{js,mjs,cjs,ts,mts,mjs,json,conf}`;
    }
}
