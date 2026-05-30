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
import type {
    InvalidateListener,
    InvalidatingStore,
    Leaf,
    LinesRecord,
    StoreGetContext,
    StoreSetContext,
} from 'ilingo';
import { MemoryStore, isBCP47LanguageCode, isLineRecord } from 'ilingo';
import type { ConfigInput } from './types';
import { buildConfig } from './utils';

type ChokidarLike = {
    watch(paths: string | string[], options?: object): {
        on(event: 'add' | 'change' | 'unlink', cb: (path: string) => void): unknown,
        close(): Promise<void>,
    },
};

export class FSStore extends MemoryStore implements InvalidatingStore {
    protected loaded: Record<string, string[]>;

    protected directories: string[];

    protected writeDirectory: string;

    protected merger: Merger;

    protected listeners = new Set<InvalidateListener>();

    /** Active chokidar watcher (only when `watch: true`). Closed by `close()`. */
    protected watcher: ReturnType<ChokidarLike['watch']> | undefined;

    constructor(input?: ConfigInput) {
        super({ id: input?.id ?? Symbol('FSStore'), data: {} });

        const options = buildConfig(input);

        this.loaded = {};
        this.directories = options.directory;
        this.writeDirectory = options.writeDirectory;

        this.merger = createMerger({
            inPlace: true,
            array: true,
            arrayDistinct: true,
        });

        if (options.watch) {
            // chokidar is loaded asynchronously so that consumers who don't
            // enable watch mode never pay the dep cost. We start the watcher
            // promise-style; readiness is not awaited here (callers can
            // await get()s freely — the cache will simply not be hot-
            // invalidated until chokidar has signalled `ready`).
            this.startWatcher().catch(() => { /* swallow — see startWatcher */ });
        }
    }

    // ------------------------------------------
    override async get(context: StoreGetContext): Promise<Leaf | undefined> {
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

    override async getLocales(): Promise<string[]> {
        const locations = await locateMany(['*'], {
            path: this.directories,
            onlyDirectories: true,
        });

        return locations
            .filter((location) => isBCP47LanguageCode(location.name))
            .map((location) => location.name);
    }

    // ------------------------------------------

    /**
     * Drop cached file content for the matching scope. The next `get()` for
     * an affected key will re-read from disk.
     */
    invalidate(locale?: string, group?: string): void {
        if (typeof locale === 'undefined') {
            this.loaded = {};
            this.data = {};
        } else if (typeof group === 'undefined') {
            delete this.loaded[locale];
            delete this.data[locale];
        } else {
            const groups = this.loaded[locale];
            if (groups) {
                this.loaded[locale] = groups.filter((g) => g !== group);
            }
            if (this.data[locale]) {
                delete this.data[locale][group];
            }
        }
        for (const listener of this.listeners) {
            listener(locale, group);
        }
    }

    on(event: 'invalidate', listener: InvalidateListener): () => void {
        if (event !== 'invalidate') return () => {};
        this.listeners.add(listener);
        return () => { this.listeners.delete(listener); };
    }

    /**
     * Stop the file watcher (if active) and detach all listeners. Idempotent.
     * Useful in tests and on app shutdown — once closed, the store still
     * serves cached reads but no longer reacts to file-system changes.
     */
    async close(): Promise<void> {
        if (this.watcher) {
            await this.watcher.close();
            this.watcher = undefined;
        }
        this.listeners.clear();
    }

    // ------------------------------------------

    protected isLoaded(group: string, locale: string): boolean {
        this.loaded[locale] = this.loaded[locale] || [];

        return this.loaded[locale].includes(group);
    }

    protected setIsLoaded(group: string, locale: string) {
        this.loaded[locale] = this.loaded[locale] || [];

        this.loaded[locale].push(group);
    }

    // ------------------------------------------

    async loadGroup(group: string, locale: string): Promise<Record<string, any>> {
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

    /**
     * Start watching the configured directories. Each `(directory, locale,
     * group)` file change calls `invalidate(locale, group)`. Errors loading
     * chokidar (e.g. consumer hasn't installed the optional peer) throw a
     * clear message — caught and rethrown as a deferred error so the
     * constructor doesn't reject.
     */
    protected async startWatcher(): Promise<void> {
        let chokidar: ChokidarLike;
        try {
            // Lazy import so the dep is loaded only when watch mode is on.
            chokidar = await import('chokidar') as unknown as ChokidarLike;
        } catch (err) {
            // eslint-disable-next-line no-console
            console.error(
                '[ilingo/fs] watch: true requires the optional `chokidar` peer dependency. ' +
                'Install it via `npm i chokidar -D`.',
                err,
            );
            return;
        }

        this.watcher = chokidar.watch(this.directories, {
            ignoreInitial: true,
            persistent: false,
        });
        const onPath = (changedPath: string) => {
            const parsed = this.parseLocaleGroup(changedPath);
            if (parsed) this.invalidate(parsed.locale, parsed.group);
        };
        this.watcher.on('add', onPath);
        this.watcher.on('change', onPath);
        this.watcher.on('unlink', onPath);
    }

    /**
     * Map a file path under one of the configured directories to its
     * `(locale, group)` pair. Returns `undefined` if the path doesn't sit
     * exactly under `<dir>/<locale>/<group>.<ext>` (e.g. a deeper nesting,
     * or a sibling file not owned by us).
     */
    protected parseLocaleGroup(filePath: string): { locale: string, group: string } | undefined {
        const absPath = path.resolve(filePath);
        for (const dir of this.directories) {
            const absDir = path.resolve(dir);
            if (absPath.startsWith(`${absDir}${path.sep}`)) {
                const rel = absPath.slice(absDir.length + 1);
                const parts = rel.split(path.sep);
                if (parts.length === 2) {
                    const [locale, file] = parts;
                    const dotIdx = file.lastIndexOf('.');
                    if (dotIdx > 0 && isBCP47LanguageCode(locale)) {
                        return { locale, group: file.slice(0, dotIdx) };
                    }
                }
            }
        }
        return undefined;
    }

    protected buildLocatorOptionsForLocale(locale?: string): LocatorOptionsInput {
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
        const lineRecord: LinesRecord = {};
        for (const file of files) {
            if (isLineRecord(file)) {
                this.merger(lineRecord, file);
            }
        }

        return lineRecord;
    }
}
