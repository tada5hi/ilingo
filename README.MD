[![npm version](https://badge.fury.io/js/ilingo.svg)](https://badge.fury.io/js/ilingo)
[![codecov](https://codecov.io/gh/tada5hi/ilingo/branch/master/graph/badge.svg?token=4KNSG8L13V)](https://codecov.io/gh/tada5hi/ilingo)
[![Master Workflow](https://github.com/tada5hi/ilingo/actions/workflows/main.yml/badge.svg)](https://github.com/tada5hi/ilingo)

# Ilingo 💬
This is a lightweight library for translation.

**Table of Contents**

- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
  - [Parameters](#parameters)
  - [Locales](#locales)
  - [Lazy](#lazy)
## Installation

```bash
npm install ilingo --save
```

---
**Important NOTE**

The `README.md` file is under construction ☂ at the moment.
So please stay patient or contribute to it, till it covers all parts ⭐.

---

## Configuration

While full localization of an application is a complex subject,
it’s simple to swap out strings in your application with different supported languages.

Therefore, create a language directory somewhere in your project.
For each locale (e.g. en, de, ...), which should be supported, create a folder inside.

Language strings are stored in subdirectories as group for each supported language (locale).

```bash
├── ...
└── language
    ├── de
    │   ├── app.{js,ts}      # app group
    │   └── forum.{js,ts}    # forum group
    └── en
        ├── app.{js,ts}      # app group
        └── forum.{js,ts}    # forum group
```

Language groups do not have any specific naming convention that are required.
The file should be named logically to describe the type of content it holds (e.g. app, forum, ...).
For example, let’s say you want to create a file containing error messages.
You might name it simply: `error.{js,ts}`.

Each file should return an object with a language key and a string to return.

**`app.{ts,js}`**
```typescript
module.exports = {
    'languageKey': 'The message to be shown.'
}
```

The object can also be nested.

**`app.{ts,js}`**
```typescript
module.exports = {
    'nested': {
        'key': 'The message to be shown.'
    }
}
```
It is also possible to use `export default {...}` instead of `module.exports = {...}`

## Usage

The fist step, is to specify a configuration for the singleton instance.
This configuration can also be overwritten later.

```typescript
import {useLanguage} from "ilingo";

useLanguage({
    /**
     * Default: path.join(process.cwd(), 'language')
     */
    directory: [path.join(process.cwd(), 'language')],
    /**
     * Default: en
     */
    locale: 'en'
})
```

You can use the direct method of the singleton instance, or use a helper function
to retrieve text from any of the language files,
by passing the filename and the language key as the first parameter, separated by a period (.).
For example, to retrieve the languageKey string from the example above, you would do the following:

**`Async`**

```typescript
import {useLanguage} from "ilingo";

(async () => {
    console.log(await useLanguage().get('app.languageKey'));

    // lang is a helper function for fast access ;)
    console.log(await lang('app.languageKey'));
})();
```

**`Sync`**

```typescript
import {useLanguage} from "ilingo";

console.log(useLanguage().getSync('app.languageKey'));

// lang is a helper function for fast access ;)
console.log(langSync('app.languageKey'));
```

### Parameters
As template delimiter a mustache like brackets `{{}}` interpolation is used.
Data properties can be injected as second argument, e.g.

**`app.{ts,js}`**
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

The default locale, which is used by the singleton instance, can be `globally` overwritten after initialisation:

```typescript
import {useLanguage} from "ilingo";

(async () => {
    const language = useLanguage();

    let output = await language.get('app.age', {age: 18});
    console.log(output);
    // I am 18 yeas old

    language.setOptions({
        locale: 'de'
    });

    output = await lang('app.age', {age: 18});
    console.log(output);
    // Ich bin 18 Jahre alt
})();
```

Another option to `temporary` overwrite the default locale, is to pass the locale as third argument
to one of the helper or singleton methods:

```typescript
import {useLanguage} from "ilingo";

(async () => {
    const language = useLanguage({
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

### Lazy

Another option is to either to not access the file system at all or just
add few translations afterwards.

```typescript
import {useLanguage} from "ilingo";

(async () => {
    const language = useLanguage({
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
