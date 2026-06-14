# ilingo 📚

[![npm version](https://img.shields.io/npm/v/ilingo.svg)](https://www.npmjs.com/package/ilingo)
[![npm downloads](https://img.shields.io/npm/dm/ilingo.svg)](https://www.npmjs.com/package/ilingo)
[![minzipped size](https://img.shields.io/bundlephobia/minzip/ilingo)](https://bundlephobia.com/package/ilingo)
[![Master Workflow](https://github.com/tada5hi/ilingo/actions/workflows/main.yml/badge.svg)](https://github.com/tada5hi/ilingo/actions/workflows/main.yml)
[![codecov](https://codecov.io/gh/tada5hi/ilingo/branch/master/graph/badge.svg?token=4KNSG8L13V)](https://codecov.io/gh/tada5hi/ilingo)

A lightweight, framework-agnostic translation and internationalization (i18n) library for TypeScript — pluggable stores, BCP-47 fallback, ICU-lite plurals, and Intl-native formatters.

**Table of Contents**

- [Usage](#usage)
- [Packages](#packages)
  - [Core](#core-)
  - [FS](#fs-)
  - [Vue](#vue-)
  - [Vuelidate](#vuelidate-)
  - [Validup](#validup-)
- [License](#license)

## Usage

Create an instance and set the default locale.

```typescript
import { Ilingo } from 'ilingo';

const ilingo = new Ilingo({
    locale: 'en'
})
```

The **default** (memory-) store can be initialized with some default data.

```typescript
import {
    Ilingo,
    MemoryStore,
    defineCatalog,
    defineLocale,
    defineNamespace,
    defineTranslations,
} from 'ilingo';

const store = new MemoryStore({
    data: defineCatalog([
        // locale: de
        defineLocale('de', [
            // namespace: app
            defineNamespace('app', [
                defineTranslations({ key: 'Hallo mein Name ist {{name}}' }),
            ]),
        ]),
        // locale: en
        defineLocale('en', [
            defineNamespace('app', [
                defineTranslations({ key: 'Hello my name is {{name}}' }),
            ]),
        ]),
    ]),
});

const ilingo = new Ilingo({
    store,
    locale: 'en'
});
```

To retrieve text from any of the language files, simply pass the filename/namespace and the access key
as the first parameter, separated by a period (.).

After that you can simply access the locale string, as described in the following:

```typescript
import { Ilingo } from 'ilingo';

const ilingo = new Ilingo({
    // ...
});

await ilingo.get({ 
    namespace: 'app', 
    key: 'key'
});
// Hello my name is {{name}}

await ilingo.get({ 
    namespace: 'app', 
    key: 'key', 
    data: {
        name: 'Peter'
    }
});
// Hello my name is Peter

await ilingo.get({
    namespace: 'app',
    key: 'key',
    data: {
        name: 'Peter'
    },
    locale: 'de'
});
// Hallo mein Name ist Peter
```

To learn more about usage, inspect the [README.md](./packages/ilingo/README.md) of the core package.  

## Packages

The repository contains the following packages:

### Core 💬

**`ilingo`**

This package contains the base library 
for translation and internationalization

[Documentation](./packages/ilingo/README.md)

### FS 🗃️

**`@ilingo/fs`**

This package contains a file-system store for the
ilingo package.

[Documentation](./packages/fs/README.md)

### Vue 🖌️

**`@ilingo/vue`**

This package contains an adapter for vue.

[Documentation](./packages/vue/README.md)

### Vuelidate 🎉

**`@ilingo/vuelidate`**

This package contains an adapter for the vuelidate library.

[Documentation](./packages/vuelidate/README.md)

### Validup 🛡️

**`@ilingo/validup`** + **`@ilingo/validup-vue`**

Adapter pair for the [validup](https://www.npmjs.com/package/validup) ecosystem. `@ilingo/validup` is the framework-agnostic core — default EN/DE/FR/ES catalogs for the built-in `IssueCode`s, the pre-seeded `Store`, `translateIssue` / `translateIssues` helpers — embeddable in any runtime (Node SSR, edge, queue workers). `@ilingo/validup-vue` adds the Vue 3 plugin, composables (`useTranslationsForField`, `useTranslationsForComposable`, `useTranslationsForIssues`), and the `<IValidup>` renderless component. Mirrors the `validup` → `@validup/vue` split so Vue is opt-in, not a hard dep on the validation-message surface.

[Core](./packages/validup/README.md) · [Vue](./packages/validup-vue/README.md)

## License

Made with 💚

Published under [MIT License](./LICENSE).
