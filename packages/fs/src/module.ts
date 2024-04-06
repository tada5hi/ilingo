/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { LocatorOptionsInput } from 'locter';
import {
    load,
    locateMany,
} from 'locter';
import path from 'node:path';
import type { Merger } from 'smob';
import { createMerger } from 'smob';
import type { LinesRecord, StoreGetContext, StoreSetContext } from 'ilingo';
import { MemoryStore, isBCP47LanguageCode, isLineRecord } from 'ilingo';
import type { ConfigInput } from './types';
import { buildConfig } from './utils';

export class FSStore extends MemoryStore {
    protected loaded : Record<string, string[]>;

    protected directories : string[];

    protected merger : Merger;

    constructor(input?: ConfigInput) {
        super();

        const options = buildConfig(input);

        this.loaded = {};
        this.directories = options.directory;

        this.merger = createMerger({
            inPlace: true,
            array: true,
            arrayDistinct: true,
        });
    }

    // ------------------------------------------
    override async get(context: StoreGetContext): Promise<string | undefined> {
        await this.loadGroup(context.group, context.locale);

        return super.get(context);
    }

    override async set(context: StoreSetContext): Promise<void> {
        return super.set(context);

        // todo: write to file!
    }

    // ------------------------------------------

    override async getLocales() : Promise<string[]> {
        const locations = await locateMany(['*'], {
            path: this.directories,
            onlyDirectories: true,
        });

        return locations
            .filter((location) => isBCP47LanguageCode(location.name))
            .map((location) => location.name);
    }

    // ------------------------------------------

    protected isLoaded(group: string, locale: string) : boolean {
        this.loaded[locale] = this.loaded[locale] || [];

        return this.loaded[locale].indexOf(group) !== -1;
    }

    protected setIsLoaded(group: string, locale: string) {
        this.loaded[locale] = this.loaded[locale] || [];

        this.loaded[locale].push(group);
    }

    // ------------------------------------------

    async loadGroup(group: string, locale: string) : Promise<Record<string, any>> {
        // only load file once
        if (this.isLoaded(group, locale)) {
            /* istanbul ignore next */
            return {};
        }

        this.initLines(group, locale);
        this.setIsLoaded(group, locale);

        const locations = await locateMany(
            this.addExtensionPattern(group),
            this.buildLocatorOptionsForLocale(locale),
        );

        const loadPromises = locations.map(
            (location) => load(location)
                .then((data) => (data && data.default ? data.default : data)),
        );

        const files = await Promise.all(loadPromises);
        if (files.length === 0) {
            return {};
        }

        this.data[locale][group] = this.mergeFiles(files);

        return this.data[locale][group];
    }

    protected buildLocatorOptionsForLocale(locale?: string) : LocatorOptionsInput {
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
        const lineRecord : LinesRecord = {};
        for (let i = 0; i < files.length; i++) {
            const file = files[i];

            if (isLineRecord(file)) {
                this.merger(lineRecord, file);
            }
        }

        return lineRecord;
    }
}
