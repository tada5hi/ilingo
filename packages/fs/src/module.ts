/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { mkdir, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import type { LocatorInfo, LocatorOptionsInput } from 'locter';
import {
    locateMany,
    locateManySync,
    readAsModule,
    readAsModuleSync,
} from 'locter';
import type { Merger } from 'smob';
import { createMerger } from 'smob';
import type {
    IInvalidatingStore,
    InvalidateListener,
    Leaf,
    NamespaceBodyInput,
    StoreGetContext,
    StoreSetContext,
    Translations,
} from 'ilingo';
import {
    MemoryStore,
    SyncUnavailableError,
    isBCP47LanguageCode,
    normalizeNamespaceBody,
} from 'ilingo';
import type { FSStoreOptionsInput } from './types';
import { normalizeOptions } from './utils';
import type { TwinBody } from 'twinop';
import { op, runTwinAsync, runTwinSync } from 'twinop';

type ChokidarLike = {
    watch(paths: string | string[], options?: object): {
        on(event: 'add' | 'change' | 'unlink', cb: (path: string) => void): unknown,
        close(): Promise<void>,
    },
};

export class FSStore extends MemoryStore implements IInvalidatingStore {
    protected loaded: Record<string, string[]>;

    protected directories: string[];

    protected writeDirectory: string;

    protected merger: Merger;

    protected listeners = new Set<InvalidateListener>();

    /**
     * In-flight `readNamespace` calls, keyed by `(locale, namespace)`, so
     * concurrent readers share one directory scan instead of racing on a
     * half-populated record.
     */
    protected loading = new Map<string, Promise<Record<string, any>>>();

    /**
     * Bumped by `invalidate()`. A read captures it at the start and discards
     * its result if it changed meanwhile — same in-flight-vs-invalidate guard
     * as `LoaderStore`.
     */
    protected generation = 0;

    /** Active chokidar watcher (only when `watch: true`). Closed by `close()`. */
    protected watcher: ReturnType<ChokidarLike['watch']> | undefined;

    constructor(input?: FSStoreOptionsInput) {
        super({ id: input?.id ?? Symbol('FSStore'), data: [] });

        const options = normalizeOptions(input);

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
        await this.loadNamespace(context.namespace, context.locale);

        return super.get(context);
    }

    /**
     * Synchronous read. Unlike a network-backed adapter, a filesystem store
     * *can* honour this: `locter` ships a synchronous twin for every read
     * (`locateManySync`, `loadSync`), so a cold namespace is read from disk
     * right here rather than declining. That is what lets a server-rendered
     * tree resolve `@ilingo/fs` translations on its first pass with no
     * warm-up step at all.
     *
     * The read blocks — deliberately. `getSync`'s contract is that it must not
     * start work whose result it cannot return; synchronous I/O returns its
     * result, an `import()` does not. The cost is one glob plus one file read
     * per `(locale, namespace)`, cached for the process lifetime, so it is
     * paid once per namespace and never again. If blocking the event loop
     * during a render is unacceptable for your deployment, warm the store with
     * `await loadNamespace(...)` and this method will find everything cached.
     *
     * @throws {SyncUnavailableError} only when the file genuinely cannot be
     * read synchronously — an ESM module that needs an asynchronous `import()`.
     * A malformed file propagates its real parse error instead, because that
     * is a fault to fix, not a reason to fall back.
     */
    override getSync(context: StoreGetContext): Leaf | undefined {
        if (!this.isLoaded(context.namespace, context.locale)) {
            try {
                this.loadNamespaceSync(context.namespace, context.locale);
            } catch (e) {
                if (!isAsyncOnlyLoadError(e)) {
                    throw e;
                }

                throw new SyncUnavailableError(
                    `[ilingo/fs] "${context.locale}/${context.namespace}" can only be loaded ` +
                    'asynchronously (an ES module requiring import()) — await get() instead.',
                    {
                        locale: context.locale,
                        namespace: context.namespace,
                        key: context.key,
                        storeId: this.id,
                        cause: e,
                    },
                );
            }
        }

        return super.getSync(context);
    }

    override async set(context: StoreSetContext): Promise<void> {
        // Ensure the in-memory record reflects the latest on-disk state
        // before merging the new value, so the write does not drop sibling keys.
        await this.loadNamespace(context.namespace, context.locale);

        await super.set(context);

        await this.persist(context.locale, context.namespace);
    }

    // ------------------------------------------

    override async getLocales(): Promise<string[]> {
        const locations = await locateMany(['*'], {
            cwd: this.directories,
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
    invalidate(locale?: string, namespace?: string): void {
        // Any read that is already in flight is stale from here on — see the
        // generation guard in readNamespace.
        this.generation += 1;

        if (typeof locale === 'undefined') {
            this.loaded = {};
            this.data = {};
        } else if (typeof namespace === 'undefined') {
            delete this.loaded[locale];
            delete this.data[locale];
        } else {
            const namespaces = this.loaded[locale];
            if (namespaces) {
                this.loaded[locale] = namespaces.filter((g) => g !== namespace);
            }
            if (this.data[locale]) {
                delete this.data[locale][namespace];
            }
        }
        for (const listener of this.listeners) {
            listener(locale, namespace);
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

    protected isLoaded(namespace: string, locale: string): boolean {
        this.loaded[locale] = this.loaded[locale] || [];

        return this.loaded[locale].includes(namespace);
    }

    protected setIsLoaded(namespace: string, locale: string) {
        this.loaded[locale] = this.loaded[locale] || [];

        this.loaded[locale].push(namespace);
    }

    // ------------------------------------------

    async loadNamespace(namespace: string, locale: string): Promise<Record<string, any>> {
        // only load file once
        if (this.isLoaded(namespace, locale)) {
            /* istanbul ignore next */
            return {};
        }

        // De-duplicate concurrent loads for the same pair. The flag is only
        // set once the data is actually in place (see readNamespaceBody), so a
        // second caller arriving mid-load must wait on the first one's promise
        // rather than short-circuit on the flag — otherwise it would read the
        // still-empty record and report a spurious miss.
        const key = `${locale} ${namespace}`;
        const inflight = this.loading.get(key);
        if (inflight) {
            return inflight;
        }

        const promise = runTwinAsync(this.readNamespaceBody(namespace, locale))
            .finally(() => {
                this.loading.delete(key);
            });
        this.loading.set(key, promise);

        return promise;
    }

    /**
     * Synchronous twin of {@link loadNamespace}, reading through `locter`'s
     * `locateManySync` / `loadSync`. Used by {@link getSync}, and available
     * directly for priming a store at start-up without an `await`.
     *
     * A load already in flight asynchronously cannot be awaited from here, so
     * this reads the same files again rather than waiting. Both writes produce
     * the same merged record, so the duplicate work is wasteful but never
     * inconsistent — and it only happens when the two idioms race on a cold
     * namespace.
     */
    loadNamespaceSync(namespace: string, locale: string): Record<string, any> {
        if (this.isLoaded(namespace, locale)) {
            return {};
        }

        return runTwinSync(this.readNamespaceBody(namespace, locale));
    }

    /**
     * Read every file that backs `(locale, namespace)` and merge it into the
     * in-memory record, written **once** as a `twinop` body, so the async and
     * sync loads cannot drift apart on any of the bookkeeping around the I/O:
     * the cache write, the loaded flag, the invalidation generation guard and
     * the merge order. Two hand-written copies drift, and when they do `get`
     * and `getSync` disagree about what the store holds, which is the bug class
     * this package kept hitting while the synchronous read path was built
     * (see #988).
     *
     * `setIsLoaded` runs **after** the merge, so `isLoaded` means "the data is
     * here" rather than "someone started fetching it". That is what keeps a
     * concurrent reader from seeing the still-empty record as a miss.
     *
     * An `invalidate()` that lands mid-read makes this result stale by
     * definition: the generation counter is captured at the start and the write
     * is dropped if it changed, so the next read re-reads from disk. Same guard
     * as `LoaderStore`.
     */
    protected* readNamespaceBody(namespace: string, locale: string): TwinBody<Record<string, any>> {
        const startGeneration = this.generation;

        const locations: LocatorInfo[] = yield* op(
            () => locateMany(
                this.addExtensionPattern(namespace),
                this.buildLocatorOptionsForLocale(locale),
            ),
            () => locateManySync(
                this.addExtensionPattern(namespace),
                this.buildLocatorOptionsForLocale(locale),
            ),
        );

        // One effect for the whole batch rather than one per file, so the async
        // side keeps loading them in parallel.
        //
        // `readAsModule` normalises every format to the same frozen module
        // record — `.default` always holds the file's value, whether it came
        // from JSON, a `.ts` module or a `.conf` — so the old
        // `data.default ? data.default : data` dance is gone. Both are locter
        // twins, which is what lets the two sides of this body stay a rename
        // apart.
        const files: unknown[] = yield* op(
            () => Promise.all(locations.map(
                (location) => readAsModule(location).then((record) => record.default),
            )),
            () => locations.map((location) => readAsModuleSync(location).default),
        );

        if (this.generation !== startGeneration) {
            // Invalidated mid-read — drop the result rather than repopulating
            // a cache the consumer just asked us to forget.
            return {};
        }

        this.initLines(namespace, locale);
        if (files.length > 0) {
            this.data[locale][namespace] = this.mergeFiles(files);
        }
        // Mark loaded even when no file backed the namespace: the answer
        // ("nothing here") is now cached, and repeating the directory scan on
        // every get() for a namespace that doesn't exist is the behaviour this
        // flag exists to prevent.
        this.setIsLoaded(namespace, locale);

        if (files.length === 0) {
            return {};
        }

        return this.data[locale][namespace];
    }

    /**
     * Persist the current in-memory record for `(locale, namespace)` to a JSON
     * file inside `writeDirectory`. Always writes the merged record so that
     * subsequent `loadNamespace` calls observe the change.
     *
     * Atomic via write-temp-then-rename. If the source data was originally a
     * `.ts` / `.js` / `.cjs` file the original is left untouched and the new
     * `.json` sits alongside it; on next load both are merged by smob and the
     * new JSON keys win because the loader applies later sources on top.
     *
     * The file is written as a translations node (`{ type: 'translations', data }`) so it
     * round-trips through `loadNamespace`, which expects that shape.
     */
    protected async persist(locale: string, namespace: string): Promise<void> {
        const targetDir = path.join(this.writeDirectory, locale);
        const targetFile = path.join(targetDir, `${namespace}.json`);
        const tmpFile = `${targetFile}.${process.pid}.tmp`;

        const record = (this.data[locale] && this.data[locale][namespace]) || {};
        const content = `${JSON.stringify({ type: 'translations', data: record }, null, 4)}\n`;

        await mkdir(targetDir, { recursive: true });
        await writeFile(tmpFile, content, 'utf8');
        await rename(tmpFile, targetFile);
    }

    /**
     * Start watching the configured directories. Each `(directory, locale,
     * namespace)` file change calls `invalidate(locale, namespace)`. Errors loading
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
            const parsed = this.parseLocaleNamespace(changedPath);
            if (parsed) this.invalidate(parsed.locale, parsed.namespace);
        };
        this.watcher.on('add', onPath);
        this.watcher.on('change', onPath);
        this.watcher.on('unlink', onPath);
    }

    /**
     * Map a file path under one of the configured directories to its
     * `(locale, namespace)` pair. Returns `undefined` if the path doesn't sit
     * exactly under `<dir>/<locale>/<namespace>.<ext>` (e.g. a deeper nesting,
     * or a sibling file not owned by us).
     */
    protected parseLocaleNamespace(filePath: string): { locale: string, namespace: string } | undefined {
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
                        return { locale, namespace: file.slice(0, dotIdx) };
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
            cwd: directory,
            ignore: [],
        };
    }

    protected addExtensionPattern(name: string) {
        return `${name}.{js,mjs,cjs,ts,mts,json,conf}`;
    }

    protected mergeFiles(files: unknown[]) {
        const translations: Translations = {};
        for (const file of files) {
            // Each file is a translations node — `{ type: 'translations', data }` (JSON) or
            // `export default defineTranslations({ ... })` (TS/JS). Reduce it to the
            // internal `Translations` shape and merge. A non-translations file normalizes to
            // `{}` and emits a dev warning (see normalizeNamespaceBody).
            this.merger(translations, normalizeNamespaceBody(file as NamespaceBodyInput));
        }

        return translations;
    }
}

/**
 * Node codes for "this module cannot be `require`d" — the only failures that
 * mean *try the asynchronous path instead*. Everything else (a syntax error, a
 * permissions problem, a missing directory) is a real fault: the async load
 * would fail the same way, so it must not be dressed up as "not available yet".
 */
const ASYNC_ONLY_LOAD_ERROR_CODES = new Set([
    'ERR_REQUIRE_ESM',
    'ERR_REQUIRE_ASYNC_MODULE',
]);

function isAsyncOnlyLoadError(input: unknown): boolean {
    if (typeof input !== 'object' || input === null) {
        return false;
    }

    const { code, cause } = input as { code?: unknown, cause?: unknown };
    if (typeof code === 'string' && ASYNC_ONLY_LOAD_ERROR_CODES.has(code)) {
        return true;
    }

    // locter wraps loader failures in a LoadError carrying the original.
    return typeof cause === 'undefined' ? false : isAsyncOnlyLoadError(cause);
}
