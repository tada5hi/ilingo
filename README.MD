# ilingo 💬

[![npm version](https://badge.fury.io/js/ilingo.svg)](https://badge.fury.io/js/ilingo)
[![codecov](https://codecov.io/gh/tada5hi/ilingo/branch/master/graph/badge.svg?token=4KNSG8L13V)](https://codecov.io/gh/tada5hi/ilingo)
[![Master Workflow](https://github.com/tada5hi/ilingo/actions/workflows/main.yml/badge.svg)](https://github.com/tada5hi/ilingo)
[![Known Vulnerabilities](https://snyk.io/test/github/Tada5hi/ilingo/badge.svg?targetFile=package.json)](https://snyk.io/test/github/Tada5hi/ilingo?targetFile=package.json)
[![semantic-release: angular](https://img.shields.io/badge/semantic--release-angular-e10079?logo=semantic-release)](https://github.com/semantic-release/semantic-release)

Ilingo is a lightweight library for translation and internationalization.
It can be used for client- & server-side applications 🔥.
A bundled version exists for formats such as ESM, CommonJS, AMD, and IIFE-style scripts ⭐.

The file-system access is only available on server-side applications but
locale groups can also be hydrated by manipulating the cache.

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
- [License](#license)

## Installation

```bash
npm install ilingo --save
```

---
**Important NOTE**

The library provides `sync` and `async` methods to receive a (compiled) locale key string. The reason
for this is that on server side applications, the library interacts with the file system, and this can be done either in a blocking or non-blocking way ⭐.
On client side applications, use the `sync` methods 🔥

---

## Configuration
While full localization of an application is a complex subject,
swapping out strings in your application for different supported languages/locales is simple.

**`Client`**

On the client side, no configuration is required. The different locale strings for translation are provided
by interacting with the library class instance.

**`Server`**

Locale strings are stored in subdirectories as a group for each supported language (locale) on the server side.

```bash
├── ...
└── language
    ├── de
    │   ├── app.{ts,js,json}      # app group
    │   └── forum.{ts,js,json}    # forum group
    └── en
        ├── app.{ts,js,json}      # app group
        └── forum.{ts,js,json}    # forum group
```

To get started, create a language directory somewhere in your project.
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

## Usage

### Basic

The primary usage on the serer-side is to create an instance of the `Ilingo` class and set one or more directories,
which should be scanned for locale groups.

```typescript
import { Ilingo } from 'ilingo/server';

const language = new Ilingo({
    directory: [path.join(process.cwd(), 'language')],
    locale: 'en'
})
```

Client-side applications, rely on manipulating the cache. This can be done during instance creation or afterward using the `setCache` method.
Using the cache is also supported for server-side applications.
```typescript
import { Ilingo } from 'ilingo';

const language = new Ilingo({
    cache: {
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

// The second parameter specifies,
// if the cache should be extended or overwritten.
language.setCache({
    // locale: de
    de: {
        // group: app
        app: {
            key: 'Der anzuzeigende string.'
        }
    }
}, true);
```

To retrieve text from any of the language files, simply pass the filename/group and the access key as the first parameter, separated by a period (.).

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

The library also supports built-in singleton support. There can be multiple side-by-side instances, by providing a **key** as an additional
parameter for the singleton method.

The default key is: `default`

The fist step, is to specify a configuration for the singleton instance if you do not want to use the default ones.
Options are only passed to the class if it is not created yet!

```typescript
import { useIlingo } from 'ilingo/server';

useIlingo({
    /**
     * Default: path.join(process.cwd(), 'language')
     */
    directory: [path.join(process.cwd(), 'language')],
    /**
     * Default: en
     */
    locale: 'en'
}, 'default');

console.log(useIlingo().getSync('app.key'));
// The locale string to be shown.

console.log(
    useIlingo(undefined, 'default')
        .getSync('app.key')
);
// The locale string to be shown.
```

### Helper
Besides using a singleton instance, the library also provides helper functions
allowing faster access.

The helper always refers to the `default` singleton instance and should therefore be used with caution
if multiple singleton instances are used.

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

**`app.{ts,js,json}`**
```typescript
module.exports = {
    'age': 'I am {{age}} years old.'
}
```

```typescript
(async () => {
    const output = await lang('app.age', {age: 18});
    console.log(output);
    // I am 18 yeas old
});
```

### Locales

The default locale, which is used by the singleton instance, can be modified after initialization:

```typescript
import { useIlingo } from 'ilingo';

(async () => {
    const language = useIlingo();

    let output = await language.get('app.age', {age: 18});
    console.log(output);
    // I am 18 yeas old

    language.setLocale('de');

    output = await lang('app.age', {age: 18});
    console.log(output);
    // Ich bin 18 Jahre alt
})();
```

It also can be **temporarily** overwritten, by passing the locale as the third argument
to one of the helper or supported singleton methods:

```typescript
import { useIlingo } from 'ilingo';

(async () => {
    const language = useIlingo({
        locale: 'en'
    });

    let output = await language.get('app.age', {age: 18});
    console.log(output);
    // I am 18 yeas old

    output = await language.get('app.age', {age: 18}, 'fr');
    console.log(output);
    // J'ai 18 ans

    output = await lang('app.age', {age: 18}, 'de');
    console.log(output);
    // Ich bin 18 Jahre alt
})();
```

### Async/Sync

**`Async`**

```typescript
import { useIlingo } from 'ilingo';

(async () => {
    console.log(await useIlingo().get('app.languageKey'));

    // lang is a helper function for fast access ;)
    console.log(await lang('app.languageKey'));
})();
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
translations afterwards.

```typescript
import { useIlingo } from 'ilingo';

(async () => {
    const language = useIlingo({
        locale: 'en'
    });

    language.set('foo.bar', 'baz {{param}}');
    language.set('foo.bar', 'boz {{param}}', 'de');

    let output = await language.get('foo.bar', {param: 'x'});
    console.log(output);
    // baz x

    output = await language.get('foo.bar', {param: 'y'}, 'de');
    console.log(output);
    // boz y
})();
```

## License

Made with 💚

Published under [MIT License](./LICENSE).
