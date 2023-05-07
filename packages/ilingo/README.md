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
  - [Memory](#memory-store)
  - [FileSystem](#fs-store)
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

Create an instance and set the default locale.

```typescript
import { Ilingo } from 'ilingo';

const ilingo = new Ilingo({
    locale: 'en'
})
```

The **default** (memory-) store can be initialized with some default data.
This can be done during instance creation or afterward using the `set` method.
```typescript
import { Ilingo } from 'ilingo';

const ilingo = new Ilingo({
    data: {
        // locale: de
        de: {
            // group: app
            app: {
                key: 'Hallo mein Name ist {{name}}'
            }
        },
        // locale: en
        en: {
            app: {
                key: 'Hello my name is {{name}}'
            }
        }
    },
    locale: 'en'
});

ilingo.set({
    // locale: fr
    fr: {
        app: {
            key: "Je m'appelle {{name}}"
        }
    }
});
```

To retrieve text from any of the language files, simply pass the filename/group and the access key
as the first parameter, separated by a period (.).

After that you can simply access the locale string, as described in the following:

**`Sync`**
```typescript
import { Ilingo } from 'ilingo';

const ilingo = new Ilingo({
    // ...
});

console.log(ilingo.getSync('app.key'));
// Hello my name is {{name}}

console.log(ilingo.getSync('app.key', { name: 'Peter' }));
// Hello my name is Peter

console.log(ilingo.getSync('app.key', { name: 'Peter' }, 'de'));
// Hallo mein Name ist Peter
```

**`Async`**
```typescript
import { Ilingo } from 'ilingo';

const ilingo = new Ilingo({
    // ...
});

console.log(await ilingo.get('app.key'));
// Hello my name is {{name}}

console.log(await ilingo.get('app.key', { name: 'Peter' }));
// Hello my name is Peter

console.log(await ilingo.get('app.key', { name: 'Peter' }, 'de'));
// Hallo mein Name ist Peter
```

### Singleton

The library also supports built-in singleton support.

```typescript
import { useIlingo } from 'ilingo';

const ilinigo = useIlingo();

/**
 * default: en
 */
ilingo.setLocale('en');

ilingo.set('app.key', 'Hi {{name}}!');

console.log(ilingo.getSync('app.key', {name: 'Peter'}));
// Hi Peter!

```

### Helper
Besides using a singleton instance, the library also provides helper functions
allowing faster access.

The helper always refers singleton instance.

```typescript
import { useIlingo } from 'ilingo';

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

### Memory Store

The Memory Store is the default store and is set if no
other Store is specified manually.

### FS Store

The [FSStore](../fs/README.md) is a Store which access
the FileSystem for locating group files of different locales.


## License

Made with 💚

Published under [MIT License](./LICENSE).
