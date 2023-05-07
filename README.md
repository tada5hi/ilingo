# ilingo 📚

Ilingo is a lightweight library for translation and internationalization

**Table of Contents**

- [Packages](#packages)
  - [Core](#core-)
  - [FS](#fs-)
- [Usage](#usage)
- [License](#license)
  
## Packages

The repository contains the following packages:

### Core 💬

**`ilingo`**

This package contains the base library 
for translation and internationalization

[Documentation](packages/ilingo/README.md)

### FS 🗃️

**`@ilingo/fs`**

This package contains a file-system store for the
ilingo package.

[Documentation](packages/fs/README.md)

## Usage

Create an instance.

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
```

To retrieve text from any of the language files, simply pass the filename/group and the access key
as the first parameter, separated by a period (.).

After that you can simply access the locale string, as described in the following:

```typescript
import { Ilingo } from 'ilingo';

const language = new Ilingo({...});

console.log(language.getSync('app.key'));
// The locale string to be shown.

console.log(language.getSync('app.key', {}, 'de'));
// Der anzuzeigende string.
```

To learn more about usage, inspect the [README.md](./packages/ilingo/README.MD) of the core package.

## License

Made with 💚

Published under [MIT License](./LICENSE).
