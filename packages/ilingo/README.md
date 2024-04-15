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
  - [Parameters](#parameters)
  - [Locales](#locales)
  - [Lazy](#lazy)
- [Store](#store)
  - [Memory](#memory-store)
  - [FileSystem](#fs-store)
- [License](#license)

## Installation

```bash
npm install ilingo --save
```

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
```typescript
import { Ilingo } from 'ilingo';

const store = new MemoryStore({
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
        },
    }
});

const ilingo = new Ilingo({
    store,
    locale: 'en'
});
```

To retrieve text from any of the language files, simply pass the filename/group and the access key
as the first parameter, separated by a period (.).

After that you can simply access the locale string, as described in the following:

```typescript
import { Ilingo } from 'ilingo';

const ilingo = new Ilingo({
    // ...
});

await ilingo.get({
    group: 'app',
    key: 'key'
});
// Hello my name is {{name}}

await ilingo.get({
    group: 'app',
    key: 'key',
    data: {
        name: 'Peter'
    }
});
// Hello my name is Peter

await ilingo.get({
    group: 'app',
    key: 'key',
    data: {
        name: 'Peter'
    },
    locale: 'de'
});
// Hallo mein Name ist Peter
```

### Parameters
As a template delimiter a mustache like `{{}}` interpolation is used.
Data properties can be injected as a second argument, e.g.

```typescript
import { Ilingo, MemoryStore } from 'ilingo';

const ilingo = new Ilingo({
    store: new MemoryStore({
        data: {
            en: {
                app: {
                    age: 'I am {{age}} years old.'
                }
            }
        }
    })
});

await ilingo.get({
    group: 'app',
    key: 'age',
    data: {
        age: 18
    }
});
// I am 18 yeas old
```

### Locales

The default locale, which is used by the singleton instance, can be modified after initialization:

```typescript
import { Ilingo } from 'ilingo';

const ilingo = new Ilingo({
    // ...
});

await ilingo.get({
    group: 'app',
    key: 'age',
    data: {
        age: 18
    }
});
// I am 18 yeas old

ilingo.setLocale('de');

await ilingo.get({
    group: 'app',
    key: 'age',
    data: {
        age: 18
    }
});
// Ich bin 18 Jahre alt
```

It also can be **temporarily** overwritten, by passing the locale as the third argument
to one of the helper or supported singleton methods:

```typescript
import { Ilingo } from 'ilingo';

const ilingo = new Ilingo({
    // ...
});

await ilingo.get({
    group: 'app',
    key: 'age',
    data: {
        age: 18
    }
});
// I am 18 yeas old

await ilingo.get({
    group: 'app',
    key: 'age',
    data: {
        age: 18
    },
    locale: 'fr'
});
// J'ai 18 ans

await ilingo.get({
    group: 'app',
    key: 'age',
    data: {
        age: 18
    },
    locale: 'de'
});
// Ich bin 18 Jahre alt
```

### Lazy

Another option is to add translations on the fly and access them afterwards.

```typescript
import { Ilingo, MemoryStore } from 'ilingo';

const ilingo = new Ilingo({
    store: new MemoryStore({
        data: {
            en: {
                foo: {
                    bar: 'baz {{param}}'
                }
            },
            de: {
                foo: {
                    bar: 'boz {{param}}'
                }
            }
        }
    })
});

await ilingo.get({
    group: 'foo',
    key: 'bar',
    data: {
        param: 'x'
    }
});
// baz x

await ilingo.get({
    group: 'foo',
    key: 'bar',
    data: {
        param: 'y'
    },
    locale: 'de'
});
// boz y
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
