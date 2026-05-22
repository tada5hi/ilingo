# Vuelidate

`@ilingo/vuelidate` adapts ilingo to [Vuelidate](https://vuelidate.js.org). It ships built-in validator translations for **EN / DE / FR / ES** plus composables that wire Vuelidate's `$errors` shape into ilingo.

## Install

```bash
npm install @ilingo/vuelidate
```

The package depends on `@ilingo/vue`, `ilingo`, `vue`, `@vueuse/core`, and `@vuelidate/core` as peer dependencies.

## Plugin setup

```typescript
import { install } from '@ilingo/vuelidate';
import { createApp } from 'vue';
import App from './App.vue';

const app = createApp(App);
install(app);
app.mount('#app');
```

`install()` chains `@ilingo/vue`'s install, then ensures a built-in `MemoryStore` pre-loaded with EN/DE/FR/ES validator messages is registered if no store is present yet.

You can pass the same `Options` / `Ilingo` input that `@ilingo/vue`'s `install` accepts — Vuelidate's translations are added to the same instance.

## `<IVuelidate>` component

```vue
<script setup>
import { IVuelidate } from '@ilingo/vuelidate';
import useVuelidate from '@vuelidate/core';
import { minLength, maxLength } from '@vuelidate/validators';
import { reactive } from 'vue';

const form = reactive({ text: 'foo' });

const v$ = useVuelidate({
    text: {
        minLength: minLength(5),
        maxLength: maxLength(10),
    },
}, form);
</script>

<template>
    <input v-model="form.text" type="text">
    <IVuelidate :validation="v$.text" />
</template>
```

`<IVuelidate>` reads the Vuelidate validation state and renders translated messages for every failed validator. The messages are pulled from the `vuelidate` group of the ilingo instance — which the plugin populates automatically.

## Built-in validator coverage

The bundled `vuelidate` group covers Vuelidate's standard validators:

`alpha`, `alphaNum`, `between`, `decimal`, `email`, `integer`, `ipAddress`, `macAddress`, `maxLength`, `maxValue`, `minLength`, `minValue`, `numeric`, `not`, `or`, `and`, `required`, `requiredIf`, `requiredUnless`, `sameAs`, `url`.

Each message uses `{{var}}` substitution for the relevant parameter — e.g. `minLength` reads `{{min}}` from the validator's `$params`.

## Overriding messages

Validator messages live in the `vuelidate` group. Override per-locale by adding to the same group:

```typescript
import { install } from '@ilingo/vuelidate';
import { Ilingo, MemoryStore } from 'ilingo';

const ilingo = new Ilingo({
    store: new MemoryStore({
        data: {
            en: {
                vuelidate: {
                    required: 'This field is required, please.',
                },
            },
        },
    }),
});

install(app, ilingo);
```

The plugin still seeds the missing locales (DE/FR/ES); your overrides take precedence within `en` because of the store-order rule.

## Locale switching

Use `injectLocale()` from `@ilingo/vue` — Vuelidate messages re-render reactively when the locale changes:

```vue
<script setup>
import { injectLocale } from '@ilingo/vue';

const locale = injectLocale();
</script>

<template>
    <button @click="locale = 'de'">DE</button>
    <button @click="locale = 'en'">EN</button>
</template>
```
