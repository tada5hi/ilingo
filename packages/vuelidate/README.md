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

`install(app)` registers the built-in EN / DE / FR / ES validator-message catalog (the `vuelidate` group) on the app's `Ilingo` instance. If you manage the instance yourself, register it directly with the framework-agnostic `register(ilingo)` — idempotent, keyed by `STORE_ID` (`Symbol.for('@ilingo/vuelidate')`):

```typescript
import { Ilingo } from 'ilingo';
import { register } from '@ilingo/vuelidate';

const ilingo = new Ilingo();
register(ilingo); // idempotent; install(app) delegates to this
```

The `vuelidate` group is a shared key-space — register your own store **first** to override individual validator messages while this catalog supplies the defaults.

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
