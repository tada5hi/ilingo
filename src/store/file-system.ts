import type { LocatorOptions } from 'locter';
import { getModuleExport, load, locateMany } from 'locter';
import path from 'node:path';
import type { Merger } from 'smob';
import { createMerger } from 'smob';
import type { Lines } from '../type';
import { isLineRecord } from '../utils';
import { MemoryStore } from './memory';
import type { StoreGetContext, StoreSetContext } from './type';

export class FileSystemStore extends MemoryStore {
    protected loaded : Record<string, string[]>;

    protected directories : string[];

    protected merger : Merger;

    constructor(directory: string) {
        super();

        this.loaded = {};
        this.directories = Array.isArray(directory) ?
            directory :
            [directory];

        this.merger = createMerger({
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

    protected isLoaded(group: string, locale: string) : boolean {
        this.loaded[locale] = this.loaded[locale] || [];

        return this.loaded[locale].indexOf(group) !== -1;
    }

    protected setIsLoaded(group: string, locale: string) {
        this.loaded[locale] = this.loaded[locale] || [];

        this.loaded[locale].push(group);
    }

    // ------------------------------------------

    async loadGroup(file: string, locale: string) : Promise<Record<string, any>> {
        // only load file once
        if (this.isLoaded(file, locale)) {
            /* istanbul ignore next */
            return {};
        }

        this.initLines(file, locale);
        this.setIsLoaded(file, locale);

        const locations = await locateMany(
            `${file}.{js,mjs,cjs,ts,mts,mjs,json,conf}`,
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
