/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { mkdir, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import type { LocatorOptionsInput } from 'locter';
import {
    load,
    locateMany,
} from 'locter';
import type { Merger } from 'smob';
import { createMerger } from 'smob';
import type { LinesRecord, StoreGetContext, StoreSetContext } from 'ilingo';
import { MemoryStore, isBCP47LanguageCode, isLineRecord } from 'ilingo';
import type { ConfigInput } from './types';
import { buildConfig } from './utils';

export class FSStore extends MemoryStore {
    protected loaded : Record<string, string[]>;

    protected directories : string[];

    protected writeDirectory : string;

    protected merger : Merger;

    constructor(input?: ConfigInput) {
        super({ data: {} });

        const options = buildConfig(input);

        this.loaded = {};
        this.directories = options.directory;
        this.writeDirectory = options.writeDirectory;

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
        // Ensure the in-memory record reflects the latest on-disk state
        // before merging the new value, so the write does not drop sibling keys.
        await this.loadGroup(context.group, context.locale);

        await super.set(context);

        await this.persist(context.locale, context.group);
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

        return this.loaded[locale].includes(group);
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

    /**
     * Persist the current in-memory record for `(locale, group)` to a JSON
     * file inside `writeDirectory`. Always writes the merged record so that
     * subsequent `loadGroup` calls observe the change.
     *
     * Atomic via write-temp-then-rename. If the source data was originally a
     * `.ts` / `.js` / `.cjs` file the original is left untouched and the new
     * `.json` sits alongside it; on next load both are merged by smob and the
     * new JSON keys win because the loader applies later sources on top.
     */
    protected async persist(locale: string, group: string): Promise<void> {
        const targetDir = path.join(this.writeDirectory, locale);
        const targetFile = path.join(targetDir, `${group}.json`);
        const tmpFile = `${targetFile}.${process.pid}.tmp`;

        const record = (this.data[locale] && this.data[locale][group]) || {};
        const content = `${JSON.stringify(record, null, 4)}\n`;

        await mkdir(targetDir, { recursive: true });
        await writeFile(tmpFile, content, 'utf8');
        await rename(tmpFile, targetFile);
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
        for (const file of files) {
            if (isLineRecord(file)) {
                this.merger(lineRecord, file);
            }
        }

        return lineRecord;
    }
}
