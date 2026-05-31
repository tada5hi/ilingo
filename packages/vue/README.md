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
import { MemoryStore } from 'ilingo';
import { createApp } from 'vue';

const store = new MemoryStore({
    data: {
        // locale: de
        de: {
            // namespace: app
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
    }
})

const app = createApp(/* */);
install(app, {
    store,
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
    
    const translation = useTranslation({
        namespace: 'app', 
        key: 'key', 
        data: {
            name: 'Paul'
        }
    });
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

## `<ITranslateT>` — slot-aware interpolation

`<ITranslateT>` lets a message string carry **slot placeholders** alongside the usual `{{var}}` interpolations. Each `{slot}` placeholder in the message is filled by a named scoped slot — drop arbitrary VNodes (links, icons, bold runs) inline without splitting the message across multiple keys.

Message: `"Hi {{user}}, please {cta} to continue."`

```vue
<ITranslateT path="app.welcome" :data="{ user: 'Peter' }">
    <template #cta>
        <a href="/start">get started</a>
    </template>
</ITranslateT>
<!-- → <span>Hi Peter, please <a href="/start">get started</a> to continue.</span> -->
```

- Rendered tag: `<span>` by default. Override with `tag="p"` etc.; pass `tag=""` to render a fragment with no wrapper.
- Unfilled slot placeholders stay as literal `{slot}` text (no throw).
- `{{var}}` placeholders that have no matching `data` key stay as literal `{{var}}`.

## `v-t` directive

`v-t` writes the translation into the element's `textContent` and reacts to locale changes without remounting the element.

```vue
<p v-t="'app.greeting'"></p>

<p v-t="{ path: 'app.greet', data: { name: 'Peter' } }"></p>

<p v-t="{ namespace: 'cart', key: 'items', count: 3 }"></p>
```

The directive is registered globally during `install()`. Opt out per-app via `install(app, { store, directives: false })`.

## `useScopedCatalog` — per-component message scope

Some components (modals, embedded widgets, marketing sections) carry their own strings. `useScopedCatalog` creates an `Ilingo` instance whose stores resolve scoped messages first, then fall back to the parent app's stores. The scoped instance is provided to descendants — siblings outside the component still see the parent's stores.

```vue
<script setup>
import { useScopedCatalog, useTranslation } from '@ilingo/vue';

// Returns { instance, t } — use `t` inside the same component because
// Vue's provide/inject can't reach the current setup's own provides.
const { t } = useScopedCatalog({
    messages: {
        en: { modal: { greeting: 'Welcome to the modal!' } },
    },
});

const greeting = t({ namespace: 'modal', key: 'greeting' });
</script>
```

Descendants can use plain `useTranslation` — they get the scoped instance via inject. On unmount, Vue's provides become unreachable and the scoped instance is garbage-collected.

## License

Made with 💚

Published under [MIT License](./LICENSE).
