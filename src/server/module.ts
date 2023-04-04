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
    locateMany,
    locateManySync,
} from 'locter';
import path from 'node:path';
import type { ConfigInput } from '../config';
import { AbstractIlingo } from '../module';
import type { Lines } from '../type';
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

        const locations = await locateMany(
            this.addExtensionPattern(file),
            this.buildLocatorOptions(locale),
        );

        const loadPromises = locations.map(
            (location) => load(location)
                .then((output) => {
                    const { value: data } = getModuleExport(output);
                    return data;
                }),
        );

        const files = await Promise.all(loadPromises);
        if (files.length === 0) {
            return {};
        }

        this.data[locale][file] = this.mergeFiles(files);

        return this.data[locale][file];
    }

    loadGroupSync(file: string, locale?: string) : Record<string, any> {
        locale = locale || this.getLocale();

        if (this.isLoaded(file, locale)) {
            /* istanbul ignore next */
            return {};
        }

        this.initLines(file, locale);
        this.setIsLoaded(file, locale);

        const locations = locateManySync(
            this.addExtensionPattern(file),
            this.buildLocatorOptions(locale),
        );

        if (locations.length === 0) {
            return {};
        }

        const files = [];
        for (let i = 0; i < locations.length; i++) {
            const file = loadSync(locations[i]);
            const { value: data } = getModuleExport(file);
            files.push(data);
        }

        this.data[locale][file] = this.mergeFiles(files);

        return this.data[locale][file];
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

    protected mergeFiles(files: unknown[]) {
        const lineRecord : Lines = {};
        for (let i = 0; i < files.length; i++) {
            const file = files[i];

            if (isLineRecord(file)) {
                this.merger(lineRecord, file);
            }
        }

        return lineRecord;
    }
}
