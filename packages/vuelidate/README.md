<p align="center">
    <img src="https://raw.githubusercontent.com/tada5hi/ilingo/HEAD/packages/vuelidate/assets/logo.svg" alt="@ilingo/vuelidate" width="128" height="128" />
</p>

<h1 align="center">@ilingo/vuelidate</h1>

<p align="center">
    <b>A <a href="https://vuelidate-next.netlify.app">Vuelidate</a> message adapter for <a href="https://www.npmjs.com/package/ilingo">ilingo</a>: drop-in localized validator messages (EN / DE / FR / ES) for Vue 3 forms.</b>
</p>

<p align="center">
    <a href="https://www.npmjs.com/package/@ilingo/vuelidate"><img src="https://img.shields.io/npm/v/@ilingo/vuelidate" alt="npm version" /></a>
    <a href="https://github.com/tada5hi/ilingo/actions/workflows/main.yml"><img src="https://github.com/tada5hi/ilingo/actions/workflows/main.yml/badge.svg" alt="CI" /></a>
    <a href="https://bundlephobia.com/package/@ilingo/vuelidate"><img src="https://img.shields.io/bundlephobia/minzip/@ilingo/vuelidate" alt="minzipped size" /></a>
</p>

<p align="center">
    <a href="#installation"><b>Installation</b></a>
    ·
    <a href="#usage">Usage</a>
    ·
    <a href="#ivuelidate"><code>&lt;IVuelidate&gt;</code></a>
    ·
    <a href="#composables">Composables</a>
    ·
    <a href="#first-render-ssr">SSR</a>
</p>

---

Show Vuelidate's failing rules as sentences in the user's language instead of writing a message map per validator and per locale. The package ships EN / DE / FR / ES messages for the validator names in the `vuelidate` namespace, fills each message with the rule's `$params`, and follows the [`@ilingo/vue`](https://www.npmjs.com/package/@ilingo/vue) locale.

## Installation

```bash
npm install @ilingo/vuelidate @ilingo/vue ilingo vue @vueuse/core @vuelidate/core
```

ESM only. Peer dependencies: `@ilingo/vue`, `ilingo`, `vue`, `@vueuse/core` and `@vuelidate/core`; add `@vuelidate/validators` for the built-in rules used below. The `./core` and `./vue` subpaths re-export `ilingo` and `@ilingo/vue`.

## Usage

```typescript
import { install } from '@ilingo/vuelidate';
import { createApp } from 'vue';

const app = createApp(/* */);
install(app);
app.mount('#app');
```

`install(app, input?)` takes the same input as [`@ilingo/vue`'s `install`](https://www.npmjs.com/package/@ilingo/vue#install-input) and registers the built-in EN / DE / FR / ES validator-message catalog (the `vuelidate` namespace) on that instance, via the **eager** store. It does not register `<ITranslate>` or `v-t`; install `@ilingo/vue` for those. Installed after `@ilingo/vue`, `install(app)` adds the catalog to the instance the app already provides.

If you manage the instance yourself, register a catalog store directly. Both stores are keyed by `Symbol.for('@ilingo/vuelidate')`, and `Ilingo.registerStore` skips a store whose id is already registered, so registering twice is harmless:

```typescript
import { Ilingo } from 'ilingo';
import { createMemoryStore } from '@ilingo/vuelidate/store/memory';

const ilingo = new Ilingo();
ilingo.registerStore(createMemoryStore()); // eager; install(app) does the same
```

`@ilingo/vuelidate/store/memory` also exports the `Store` class, the raw `en` / `de` / `fr` / `es` catalogs, and `extendStore(store)`, which writes the whole catalog into any `IMutableStore` you already have.

For per-locale code-splitting, use the lazy loader store instead (each locale is fetched on demand via dynamic `import()`):

```typescript
import { createLoaderStore } from '@ilingo/vuelidate/store/loader';

ilingo.registerStore(createLoaderStore());
```

The `vuelidate` namespace is a shared key-space: register your own store **first** to override individual validator messages while this catalog supplies the defaults.

A form field with its messages, switching locale through `@ilingo/vue`:

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

### `<IVuelidate>`

`<IVuelidate :validation="v$.field">` lists the messages of the field's **failing** rules, each interpolated with the rule's `$params` (for `minLength(5)`: "The minimum length allowed is 5"). A rule without a catalog entry shows its rule name. The `validation` object is read once at setup; re-key the component if you swap it for another field.

Without a slot it renders the message strings back to back. A default slot receives `{ data, severity }`:

- `data`: `{ key, value }[]`, the rule name and its message.
- `severity`: `'error'` when the field is invalid and dirty, `'warning'` when it is invalid but untouched, `undefined` when it is valid.

```vue
<IVuelidate :validation="v$.text">
    <template #default="{ data, severity }">
        <ul :class="severity">
            <li v-for="item in data" :key="item.key">{{ item.value }}</li>
        </ul>
    </template>
</IVuelidate>
```

### Composables

| Export | Returns |
|---|---|
| `useTranslationsForBaseValidation(validation)` | `Ref<Record<rule, message>>` for one field's failing rules |
| `useTranslationsForNestedValidations(validations)` | One such `Ref` per field of a nested validation object |
| `useSeverity(validation)` / `getSeverity(validation)` | The severity above, as a computed `Ref` or a plain value |

Like every composable here, call them inside `setup()`.

### First render (SSR)

The message record is resolved through a `computedAsync`, and it is **seeded synchronously** when the catalog can answer without I/O (the eager `createMemoryStore()` case). So validator messages are present on the first render instead of a tick later, and a server-rendered form hydrates without a text mismatch ([#988](https://github.com/tada5hi/ilingo/issues/988)).

A rule with no catalog entry still seeds, using the rule *name*, which is exactly what the async pass falls back to. The seed is only abandoned when a store would need I/O (a `createLoaderStore()` locale that hasn't loaded), where a fallback now would be contradicted a tick later. Any other error during that synchronous seed is also caught and logged with `console.warn`; the async pass then decides the messages.


## License

Made with 💚

Published under [MIT License](./LICENSE).
