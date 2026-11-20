<p align="center">
    <img src="https://raw.githubusercontent.com/tada5hi/ilingo/HEAD/packages/fs/assets/logo.svg" alt="@ilingo/fs" width="128" height="128" />
</p>

<h1 align="center">@ilingo/fs</h1>

<p align="center">
    <b>A file-system store adapter for <a href="https://www.npmjs.com/package/ilingo">ilingo</a>: lazy-loads locale catalogs from disk and persists translations as JSON.</b>
</p>

<p align="center">
    <a href="https://www.npmjs.com/package/@ilingo/fs"><img src="https://img.shields.io/npm/v/@ilingo/fs" alt="npm version" /></a>
    <a href="https://github.com/tada5hi/ilingo/actions/workflows/main.yml"><img src="https://github.com/tada5hi/ilingo/actions/workflows/main.yml/badge.svg" alt="CI" /></a>
    <a href="https://codecov.io/gh/tada5hi/ilingo"><img src="https://codecov.io/gh/tada5hi/ilingo/branch/master/graph/badge.svg?token=4KNSG8L13V" alt="Coverage" /></a>
    <a href="https://bundlephobia.com/package/@ilingo/fs"><img src="https://img.shields.io/bundlephobia/minzip/@ilingo/fs" alt="minzipped size" /></a>
</p>

<p align="center">
    <a href="#installation"><b>Installation</b></a>
    ·
    <a href="#usage">Usage</a>
    ·
    <a href="#options">Options</a>
    ·
    <a href="#persistence">Persistence</a>
    ·
    <a href="#synchronous-reads-ssr">Sync reads</a>
    ·
    <a href="#watch-mode-dev-hot-reload">Watch mode</a>
</p>

---

Keep your translations as files in your repository, one folder per locale and one file per namespace, and let ilingo read them when they are first needed. `FSStore` is an [ilingo](https://www.npmjs.com/package/ilingo) store: it finds `<directory>/<locale>/<namespace>.{js,mjs,cjs,ts,mts,json,conf}` on the first lookup of that namespace, caches it for the life of the process, and can write changes back as JSON. It also answers `getSync()` by reading the file synchronously, so a server render needs no warm-up step.

## Installation

```bash
npm install ilingo @ilingo/fs
```

ESM only, Node.js 22 or later (it uses `node:fs`). `ilingo` is a dependency of `@ilingo/fs`, but you import `Ilingo` from it, so install it directly too. [`chokidar`](https://github.com/paulmillr/chokidar) is an optional peer, needed only for [watch mode](#watch-mode-dev-hot-reload). `@ilingo/fs/core` re-exports `ilingo` for setups that want a single import source.

## Usage

```typescript
import { Ilingo } from 'ilingo';
import FSStore from '@ilingo/fs';

const directory = 'language';
const ilingo = new Ilingo({
    store: new FSStore({ directory }), 
})
```

Locale strings should be stored in subdirectories as a namespace for each supported language (locale).

```bash
├── ...
└── language
    ├── de
    │   ├── app.{json,ts,js,...}       # app namespace
    │   └── forum.{json,ts,js,...}     # forum namespace
    └── en
        ├── app.{json,ts,js,...}       # app namespace
        └── forum.{json,ts,js,...}     # forum namespace
```

To get started, create e.g. a language directory somewhere in your project.
Inside this directory, create a folder for each locale (e.g. en, de, ...), which should be supported.

The created folder represents a locale namespace. These namespaces do not have to follow any specific naming convention.
You should name the file according to the type of content it holds (e.g. app, forum, ...).
For example, let’s say you want to create a file containing error messages.
You might simply name it `error.json` (or `error.ts`, `error.js`, ...). The supported extensions are `.js`, `.mjs`, `.cjs`, `.ts`, `.mts`, `.json` and `.conf`.

Each file should return a **translations node**: a `defineTranslations(...)` value for script files, or a `{ "type": "translations", "data": { ... } }` literal for JSON files.

**`app.json`**
```json
{
    "type": "translations",
    "data": {
        "key": "The locale string to be shown."
    }
}
```

**`app.{ts,js}`**
```typescript
import { defineTranslations } from 'ilingo';

export default defineTranslations({
    key: 'The locale string to be shown.',
});
```

The `data` object can also be (deeply) nested ⚡. A nested object extends the dotted **key** (`{ nested: { key } }` → key `'nested.key'`):

**`app.{ts,js}`**
```typescript
import { defineTranslations } from 'ilingo';

export default defineTranslations({
    nested: {
        key: 'The locale string to be shown.',
    },
});
```

### Options

| Option | Type | Default | Description |
|---|---|---|---|
| `directory` | `string \| string[]` | `process.cwd()` | Where the locale folders live. With several directories, files for the same namespace are merged |
| `writeDirectory` | `string` | the first `directory` | Where [`set()`](#persistence) writes JSON |
| `watch` | `boolean` | `false` | Invalidate cached namespaces when files change ([watch mode](#watch-mode-dev-hot-reload)) |
| `id` | `string \| symbol` | a fresh `Symbol` | The store's identity for `ilingo.registerStore()` deduplication |

`getLocales()` lists the subfolders of every `directory` whose names are valid BCP-47 tags.

### Dotted namespaces

A dotted **namespace** maps to a dotted **filename**: namespace `app.nav` is read from `<locale>/app.nav.<ext>` (not `<locale>/app/nav.…`).

### Persistence

`FSStore.set(...)` writes the updated namespace back to disk as JSON. By default the file is written to `<directory>/<locale>/<namespace>.json`, the first configured `directory`. Pass `writeDirectory` to send writes to a separate path while still reading from the original locations:

```typescript
const store = new FSStore({
    directory: ['language', 'overrides'],
    writeDirectory: 'overrides',
});

await store.set({
    locale: 'en',
    namespace: 'app',
    key: 'greeting',
    value: 'Hello {{name}}',
});
// → overrides/en/app.json
```

Writes are atomic (write-to-temp then `rename`) and the full merged record is serialized as a translations node (`{ "type": "translations", "data": { ... } }`), so sibling keys are preserved. If the original source for a namespace was a `.ts` / `.js` / `.cjs` file, that file is left untouched and the new `.json` lives alongside it. On the next load both files are merged in the order they are found on disk, not by age, so a key present in both is not guaranteed to come from the JSON: remove it from the script file once you persist it.

### Synchronous reads (SSR)

`FSStore` implements the synchronous half of the `IStore` port for real, not just from cache: [`locter`](https://github.com/tada5hi/locter) ships a sync twin for every read it dispatches (`locateManySync`, `readAsModuleSync`), so a **cold** namespace is read from disk on the spot.

```typescript
const ilingo = new Ilingo({ store: new FSStore({ directory: './language' }) });

ilingo.getSync({ namespace: 'app', key: 'hi' });   // 'Hello' (no warm-up, no await)
```

That is what lets a server-rendered Vue tree emit real translations on its first pass instead of `namespace.key` placeholders, with no priming step and no hydration payload. Every extension (`.json`, `.conf`, `.ts`, `.mts`, `.js`, `.mjs`, `.cjs`) has a synchronous reader in locter. A module that Node refuses to `require` (`ERR_REQUIRE_ESM`, `ERR_REQUIRE_ASYNC_MODULE`, for example an ES module with top-level `await`) can only be loaded asynchronously; that case is the `SyncUnavailableError` below.

The read **blocks**, deliberately. `getSync`'s contract is that it must not start work whose result it cannot return; synchronous I/O returns its result, an `import()` does not. The cost is one glob plus one file read per `(locale, namespace)`, cached for the process lifetime: paid once per namespace, never again. If blocking during a render is unacceptable for your deployment, prime the store first (`await store.loadNamespace('app', locale)`, or `store.loadNamespaceSync('app', locale)` at start-up) and `getSync` will find everything cached.

Two failure modes are kept apart:

- a module that can only be loaded through an asynchronous `import()` → `SyncUnavailableError`, so the caller falls back to `get()`;
- a malformed file → its real parse error, propagated. The async load would fail identically, so it must not be dressed up as "not available yet".

Both read paths share **one** body internally (locter's twin scheme: one generator, two drivers), so the cache bookkeeping (the loaded flag, the in-flight dedup, the invalidation generation guard, the merge order) cannot drift between them.

## Watch mode (dev hot-reload)

`FSStore({ watch: true })` watches the configured `directory` paths via [chokidar](https://github.com/paulmillr/chokidar) and invalidates the matching `(locale, namespace)` cache entry on every file change. Subscribe via `store.on('invalidate', cb)` to react. `@ilingo/vue`'s `useTranslation` does this automatically, so file edits show up live in the rendered component without a remount.

```typescript
import { FSStore } from '@ilingo/fs';

const store = new FSStore({
    directory: './language',
    watch: process.env.NODE_ENV !== 'production',
});

store.on('invalidate', (locale, namespace) => {
    console.log(`[i18n] reloaded ${locale}/${namespace}`);
});
```

`chokidar` is an **optional peer dependency**. Install it (`npm i chokidar -D`) when enabling `watch: true`; the store logs a clear error and continues without watching if it isn't available. Call `store.close()` on app shutdown / in tests to stop the watcher; it also removes every `invalidate` listener.

Manual invalidation (no watch) works too:

```typescript
const store = new FSStore({ directory: './language' });

store.invalidate('en', 'app');   // drop the cached en/app.*; next get() re-reads
store.invalidate('en');          // drop all namespaces for en
store.invalidate();              // drop everything
```

## License

Made with 💚

Published under [MIT License](./LICENSE).
