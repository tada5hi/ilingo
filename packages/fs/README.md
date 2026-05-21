# @ilingo/fs 🗃️

[![npm version](https://badge.fury.io/js/@ilingo%2Ffs.svg)](https://badge.fury.io/js/@ilingo%2Ffs)
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

Locale strings should be stored in subdirectories as a group for each supported language (locale).

```bash
├── ...
└── language
    ├── de
    │   ├── app.{ts,js,json,conf}      # app group
    │   └── forum.{ts,js,json,conf}    # forum group
    └── en
        ├── app.{ts,js,json,conf}      # app group
        └── forum.{ts,js,json,conf}    # forum group
```

To get started, create e.g. a language directory somewhere in your project.
Inside this directory, create a folder for each locale (e.g. en, de, ...), which should be supported.

The created folder represents a locale group. These groups do not have to follow any specific naming convention.
You should name the file according to the type of content it holds (e.g. app, forum, ...).
For example, let’s say you want to create a file containing error messages.
You might simply name it: `error.{ts,js,json}`.

Each file should return an object containing an access key and a locale string.

**`app.{ts,js,json}`**
```typescript
module.exports = {
    'key': 'The locale string to be shown.'
}
```

The object can also be (deeply) nested ⚡.

**`app.{ts,js,json}`**
```typescript
module.exports = {
    'nested': {
        'key': 'The locale string to be shown.'
    }
}
```
It is also possible to use `export default {...}` instead of `module.exports = {...}` for script files.

### Persistence

`FSStore.set(...)` writes the updated group back to disk as JSON. By default the file is written to `<directory>/<locale>/<group>.json` — the first configured `directory`. Pass `writeDirectory` to send writes to a separate path while still reading from the original locations:

```typescript
const store = new FSStore({
    directory: ['language', 'overrides'],
    writeDirectory: 'overrides',
});

await store.set({
    locale: 'en',
    group: 'app',
    key: 'greeting',
    value: 'Hello {{name}}',
});
// → overrides/en/app.json
```

Writes are atomic (write-to-temp then `rename`) and the full merged record is serialized — sibling keys are preserved. If the original source for a group was a `.ts` / `.js` / `.cjs` file, that file is left untouched and the new `.json` lives alongside it; on the next load `smob` merges both, with the newer JSON taking precedence.

## License

Made with 💚

Published under [MIT License](./LICENSE).
