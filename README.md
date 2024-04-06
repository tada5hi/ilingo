# ilingo 📚

Ilingo is a lightweight library for translation and internationalization

**Table of Contents**

- [Packages](#packages)
  - [Core](#core-)
  - [FS](#fs-)
  - [Vue](#vue-)
  - [Vuelidate](#vuelidate-)
- [Usage](#usage)
- [License](#license)
  
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

## Usage

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


To learn more about usage, inspect the [README.md](./packages/ilingo/README.md) of the core package.

## License

Made with 💚

Published under [MIT License](./LICENSE).
