# @ilingo/vue 🖌️

[![npm version](https://badge.fury.io/js/@ilingo%2Fvue.svg)](https://badge.fury.io/js/@ilingo%2Fvue)
[![main](https://github.com/Tada5hi/ilingo/actions/workflows/main.yml/badge.svg)](https://github.com/Tada5hi/ilingo/actions/workflows/main.yml)
[![codecov](https://codecov.io/gh/tada5hi/ilingo/branch/master/graph/badge.svg?token=CLIA667K6V)](https://codecov.io/gh/tada5hi/ilingo)
[![Known Vulnerabilities](https://snyk.io/test/github/Tada5hi/ilingo/badge.svg)](https://snyk.io/test/github/Tada5hi/ilingo)
[![Conventional Commits](https://img.shields.io/badge/Conventional%20Commits-1.0.0-%23FE5196?logo=conventionalcommits&logoColor=white)](https://conventionalcommits.org)

This is an adapter for vue.

**Table of Contents**

- [Installation](#installation)
- [Usage](#usage)
- [License](#license)

## Installation

```bash
npm install @ilingo/vue --save
```

## Usage

```typescript
import { install } from '@ilingo/vue';
import { createApp } from 'vue';

const app = createApp(/* */);
install(app, {
    data: {
        // locale: de
        de: {
            // group: app
            app: {
                key: 'Hallo mein Name ist {{name}}',
            },
        },
        // locale: en
        en: {
            app: {
                key: 'Hello my name is {{name}}',
            },
        },
    },
});
app.mount('#app');
```

```vue

<script setup>
    import { injectLocale, useTranslation } from '@ilingo/vue';

    const locale = injectLocale();
    const set = (value) => {
        locale.value = value;
    }
    
    const translation = useTranslation('app.key', {name: 'Paul'});
</script>
<template>
    <div>
        <ITranslate path="app.key" :data="{'name': 'Peter'}"/>
        <!-- Hello my name is Peter -->
    </div>
    <div>
        {{ translation }}
        <!-- Hello my name is Paul -->
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
