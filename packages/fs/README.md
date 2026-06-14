# @ilingo/fs 🗃️

[![npm version](https://img.shields.io/npm/v/@ilingo/fs.svg)](https://www.npmjs.com/package/@ilingo/fs)
[![npm downloads](https://img.shields.io/npm/dm/@ilingo/fs.svg)](https://www.npmjs.com/package/@ilingo/fs)
[![minzipped size](https://img.shields.io/bundlephobia/minzip/@ilingo/fs)](https://bundlephobia.com/package/@ilingo/fs)
[![main](https://github.com/Tada5hi/ilingo/actions/workflows/main.yml/badge.svg)](https://github.com/Tada5hi/ilingo/actions/workflows/main.yml)
[![codecov](https://codecov.io/gh/tada5hi/ilingo/branch/master/graph/badge.svg?token=CLIA667K6V)](https://codecov.io/gh/tada5hi/ilingo)
[![Known Vulnerabilities](https://snyk.io/test/github/Tada5hi/ilingo/badge.svg)](https://snyk.io/test/github/Tada5hi/ilingo)
[![Conventional Commits](https://img.shields.io/badge/Conventional%20Commits-1.0.0-%23FE5196?logo=conventionalcommits&logoColor=white)](https://conventionalcommits.org)

This is a file system store for ilingo.

**Table of Contents**

- [Installation](#installation)
- [Usage](#usage)
- [License](#license)

## Installation

```bash
npm install @ilingo/fs --save
```

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
    │   ├── app.{ts,js,json,conf}      # app namespace
    │   └── forum.{ts,js,json,conf}    # forum namespace
    └── en
        ├── app.{ts,js,json,conf}      # app namespace
        └── forum.{ts,js,json,conf}    # forum namespace
```

To get started, create e.g. a language directory somewhere in your project.
Inside this directory, create a folder for each locale (e.g. en, de, ...), which should be supported.

The created folder represents a locale namespace. These namespaces do not have to follow any specific naming convention.
You should name the file according to the type of content it holds (e.g. app, forum, ...).
For example, let’s say you want to create a file containing error messages.
You might simply name it: `error.{ts,js,json}`.

Each file should return a **translations node** — a `defineTranslations(...)` value for script files, or a `{ "type": "translations", "data": { ... } }` literal for JSON files.

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

The `data` object can also be (deeply) nested ⚡ — a nested object extends the dotted **key** (`{ nested: { key } }` → key `'nested.key'`):

**`app.{ts,js}`**
```typescript
import { defineTranslations } from 'ilingo';

export default defineTranslations({
    nested: {
        key: 'The locale string to be shown.',
    },
});
```

### Dotted namespaces

A dotted **namespace** maps to a dotted **filename**: namespace `app.nav` is read from `<locale>/app.nav.{ts,js,json,conf}` (not `<locale>/app/nav.…`).

### Persistence

`FSStore.set(...)` writes the updated namespace back to disk as JSON. By default the file is written to `<directory>/<locale>/<namespace>.json` — the first configured `directory`. Pass `writeDirectory` to send writes to a separate path while still reading from the original locations:

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

Writes are atomic (write-to-temp then `rename`) and the full merged record is serialized — sibling keys are preserved. If the original source for a namespace was a `.ts` / `.js` / `.cjs` file, that file is left untouched and the new `.json` lives alongside it; on the next load `smob` merges both, with the newer JSON taking precedence.

## Watch mode (dev hot-reload)

`FSStore({ watch: true })` watches the configured `directory` paths via [chokidar](https://github.com/paulmillr/chokidar) and invalidates the matching `(locale, namespace)` cache entry on every file change. Subscribe via `store.on('invalidate', cb)` to react — `@ilingo/vue`'s `useTranslation` does this automatically, so file edits show up live in the rendered component without a remount.

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

`chokidar` is an **optional peer dependency**. Install it (`npm i chokidar -D`) when enabling `watch: true`; the store logs a clear error and continues without watching if it isn't available. Call `store.close()` on app shutdown / in tests to stop the watcher.

Manual invalidation (no watch) works too:

```typescript
const store = new FSStore({ directory: './language' });

store.invalidate('en', 'app');   // drop the cached en/app.* — next get() re-reads
store.invalidate('en');          // drop all namespaces for en
store.invalidate();              // drop everything
```

## License

Made with 💚

Published under [MIT License](./LICENSE).
