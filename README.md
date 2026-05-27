# ilingo 📚

A lightweight library for translation and internationalization.

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
import { Ilingo, MemoryStore } from 'ilingo';

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

**`@ilingo/validup`**

Sibling of `@ilingo/vuelidate` for the [validup](https://www.npmjs.com/package/validup) ecosystem — ships default EN/DE/FR/ES catalogs for the built-in `IssueCode`s, reactive Vue composables that translate `@validup/vue` field state, and an `<IValidup>` renderless component.

[Documentation](./packages/validup/README.md)

## License

Made with 💚

Published under [MIT License](./LICENSE).
