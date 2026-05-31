# @ilingo/vuelidate 🎉

[![npm version](https://badge.fury.io/js/@ilingo%2Fvuelidate.svg)](https://badge.fury.io/js/@ilingo%2Fvuelidate)
[![main](https://github.com/Tada5hi/ilingo/actions/workflows/main.yml/badge.svg)](https://github.com/Tada5hi/ilingo/actions/workflows/main.yml)
[![codecov](https://codecov.io/gh/tada5hi/ilingo/branch/master/graph/badge.svg?token=CLIA667K6V)](https://codecov.io/gh/tada5hi/ilingo)
[![Known Vulnerabilities](https://snyk.io/test/github/Tada5hi/ilingo/badge.svg)](https://snyk.io/test/github/Tada5hi/ilingo)
[![Conventional Commits](https://img.shields.io/badge/Conventional%20Commits-1.0.0-%23FE5196?logo=conventionalcommits&logoColor=white)](https://conventionalcommits.org)

This is an adapter for the vuelidate library.

**Table of Contents**

- [Installation](#installation)
- [Usage](#usage)
- [License](#license)

## Installation

```bash
npm install @ilingo/vuelidate --save
```

## Usage

```typescript
import { install } from '@ilingo/vuelidate';
import { createApp } from 'vue';

const app = createApp(/* */);
install(app);
app.mount('#app');
```

`install(app)` registers the built-in EN / DE / FR / ES validator-message catalog (the `vuelidate` namespace) on the app's `Ilingo` instance, via the **eager** store. If you manage the instance yourself, register a catalog store directly — `Ilingo.registerStore` dedupes by the store's `STORE_ID` (`Symbol.for('@ilingo/vuelidate')`), so it's idempotent:

```typescript
import { Ilingo } from 'ilingo';
import { createMemoryStore } from '@ilingo/vuelidate/store/memory';

const ilingo = new Ilingo();
ilingo.registerStore(createMemoryStore()); // eager — install(app) does the same
```

For per-locale code-splitting, use the lazy loader store instead (each locale is fetched on demand via dynamic `import()`):

```typescript
import { createLoaderStore } from '@ilingo/vuelidate/store/loader';

ilingo.registerStore(createLoaderStore());
```

The `vuelidate` namespace is a shared key-space — register your own store **first** to override individual validator messages while this catalog supplies the defaults.

```vue

<script setup>
    import { IVuelidate } from '@ilingo/vuelidate';
    import useVuelidate from '@vuelidate/core';
    import { minLength, maxLength } from '@vuelidate/validators';
    import { reactive } from 'vue';
    import { injectLocale } from '@ilingo/vue';

    const locale = injectLocale();
    const set = (value) => {
        locale.value = value;
    }

    const form = reactive({
        text: 'foo',
    });

    const v$ = useVuelidate({
        text: {
            minLength: minLength(5),
            maxLength: maxLength(10),
        },
    }, form);
</script>
<template>
    <div>
        <div>
            <input type="text" v-model="form.text" />
        </div>
        <div>
            <IVuelidate :validation="v$.text" />
        </div>
    </div>
    <button type="button" @click.prevent="set('en')">
        en
    </button>
    <button type="button" @click.prevent="set('de')">
        de
    </button>
</template>
```

## License

Made with 💚

Published under [MIT License](./LICENSE).
