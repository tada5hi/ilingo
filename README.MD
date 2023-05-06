# ilingo 💬

[![npm version](https://badge.fury.io/js/ilingo.svg)](https://badge.fury.io/js/ilingo)
[![codecov](https://codecov.io/gh/tada5hi/ilingo/branch/master/graph/badge.svg?token=4KNSG8L13V)](https://codecov.io/gh/tada5hi/ilingo)
[![Master Workflow](https://github.com/tada5hi/ilingo/actions/workflows/main.yml/badge.svg)](https://github.com/tada5hi/ilingo)
[![Known Vulnerabilities](https://snyk.io/test/github/Tada5hi/ilingo/badge.svg?targetFile=package.json)](https://snyk.io/test/github/Tada5hi/ilingo?targetFile=package.json)
[![semantic-release: angular](https://img.shields.io/badge/semantic--release-angular-e10079?logo=semantic-release)](https://github.com/semantic-release/semantic-release)

Ilingo is a lightweight library for translation and internationalization.

**Table of Contents**

- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
  - [Basic](#basic)
  - [Singleton](#singleton)
  - [Helper](#helper)
  - [Parameters](#parameters)
  - [Locales](#locales)
  - [Async/Sync](#asyncsync)
  - [Lazy](#lazy)
- [Store](#store)
  - [FileSystem](#filesystem-store)
- [License](#license)

## Installation

```bash
npm install ilingo --save
```

---
**Important NOTE**

The library provides `sync` and `async` methods to receive a (compiled) locale key string. The reason
for this is that a store can be accessed in a blocking or non-blocking way ⭐.

---

## Configuration
While full localization of an application is a complex subject,
swapping out strings in your application for different supported languages/locales is simple.
The different locale strings for translation are provided  by interacting with the library class instance.

## Usage

### Basic

```typescript
import { Ilingo } from 'ilingo/server';

const ilingo = new Ilingo({
    locale: 'en'
})
```

The (memory-) store can be initialized with some default data.
This can be done during instance creation or afterward using the `set` method.
```typescript
import { Ilingo } from 'ilingo';

const language = new Ilingo({
    data: {
        // locale: en
        en: {
            // group: app
            app: {
                key: 'The locale string to be shown.'
            }
        }
    },
    locale: 'en'
});

language.set({
    // locale: de
    de: {
        // group: app
        app: {
            key: 'Der anzuzeigende string.'
        }
    }
});
```

To retrieve text from any of the language files, simply pass the filename/group and the access key
as the first parameter, separated by a period (.).

After that you can simply access the locale string, as described in the following:

```typescript
import { Ilingo } from 'ilingo/server';

const language = new Ilingo({...});

console.log(language.getSync('app.key'));
// The locale string to be shown.

console.log(language.getSync('app.key', {}, 'de'));
// Der anzuzeigende string.
```

### Singleton

The library also supports built-in singleton support.

```typescript
import { useIlingo } from 'ilingo/server';

const ilinigo = useIlingo();

/**
 * default: en
 */
ilingo.setLocale('en');

/**
 * default: proccess.cwd()
 */
ilingo.setDirectory('language');


ilingo.set('app.key', 'Hi {{name}}!');

console.log(ilingo.getSync('app.key', {name: 'Peter'}));
// Hi Peter!

```

### Helper
Besides using a singleton instance, the library also provides helper functions
allowing faster access.

The helper always refers singleton instance.

```typescript
import { useIlingo } from 'ilingo/server';

(async () => {
    console.log(useIlingo().getSync('app.key'));

    // lang is a helper function for fast access ;)
    console.log(await lang('app.key'));
})();
```

### Parameters
As a template delimiter a mustache like `{{}}` interpolation is used.
Data properties can be injected as a second argument, e.g.

```typescript
import { lang, useIlingo } from 'ilingo';

const ilingo = useIlingo();
ilingo.set('app.age', 'I am {{age}} years old.');

const output = await lang('app.age', {age: 18});
console.log(output);
// I am 18 yeas old
```

### Locales

The default locale, which is used by the singleton instance, can be modified after initialization:

```typescript
import { useIlingo } from 'ilingo';

const ilingo = useIlingo();

let output = await ilingo.get('app.age', {age: 18});
console.log(output);
// I am 18 yeas old

ilingo.setLocale('de');

output = await lang('app.age', {age: 18});
console.log(output);
// Ich bin 18 Jahre alt
```

It also can be **temporarily** overwritten, by passing the locale as the third argument
to one of the helper or supported singleton methods:

```typescript
import { useIlingo } from 'ilingo';

const ilingo = useIlingo();

let output = await ilingo.get('app.age', {age: 18});
console.log(output);
// I am 18 yeas old

output = await ilingo.get('app.age', {age: 18}, 'fr');
console.log(output);
// J'ai 18 ans

output = await lang('app.age', {age: 18}, 'de');
console.log(output);
// Ich bin 18 Jahre alt
```

### Async/Sync

**`Async`**

```typescript
import { useIlingo } from 'ilingo';

console.log(await useIlingo().get('app.languageKey'));

// lang is a helper function for fast access ;)
console.log(await lang('app.languageKey'));
```

**`Sync`**

```typescript
import { useIlingo } from 'ilingo';

console.log(useIlingo().getSync('app.languageKey'));

// lang is a helper function for fast access ;)
console.log(langSync('app.languageKey'));
```

### Lazy

Another option is to not access the file system and add
translations afterward.

```typescript
import { useIlingo } from 'ilingo';

(async () => {
    const ilingo = useIlingo();

    ilingo.set('foo.bar', 'baz {{param}}');
    ilingo.set('foo.bar', 'boz {{param}}', 'de');

    let output = await ilingo.get('foo.bar', {param: 'x'});
    console.log(output);
    // baz x

    output = await ilingo.get('foo.bar', {param: 'y'}, 'de');
    console.log(output);
    // boz y
})();
```

## Store

### Filesystem Store
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

## License

Made with 💚

Published under [MIT License](./LICENSE).
