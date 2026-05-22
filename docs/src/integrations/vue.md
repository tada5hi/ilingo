# Vue

`@ilingo/vue` is a Vue 3 plugin that wires the `Ilingo` instance and a reactive locale `Ref` into your app via `provide` / `inject`.

## Install

```bash
npm install @ilingo/vue
```

## Plugin setup

```typescript
import { install } from '@ilingo/vue';
import { MemoryStore } from 'ilingo';
import { createApp } from 'vue';
import App from './App.vue';

const store = new MemoryStore({
    data: {
        en: { app: { hi: 'Hello, {{name}}!' } },
        de: { app: { hi: 'Hallo, {{name}}!' } },
    },
});

const app = createApp(App);
install(app, { store, locale: 'en' });
app.mount('#app');
```

`install(app, input)` accepts:

| Input | Effect |
|---|---|
| `undefined` | Creates a fresh `Ilingo` and provides it |
| `Ilingo` | Uses (or merges into) the existing instance |
| `{ store, locale }` | Adds the store to the existing instance, or creates one |

`install` is **idempotent and merge-aware** — calling it multiple times never clobbers existing wiring. `@ilingo/vuelidate` exploits this to chain its own installation.

## `useTranslation` composable

```vue
<script setup>
import { ref } from 'vue';
import { useTranslation } from '@ilingo/vue';

const count = ref(1);
const greeting = useTranslation({
    group: 'app',
    key: 'hi',
    data: { name: 'Paul' },
});
const items = useTranslation({
    group: 'cart',
    key: 'items',
    count,
});
</script>

<template>
    <p>{{ greeting }}</p>
    <p>{{ items }}</p>
    <button @click="count++">Add item</button>
</template>
```

`useTranslation(ctx)` returns a `Ref<string>` that re-renders when any reactive input — `locale`, `data`, `count` — changes. `count` accepts `MaybeRef<number>`.

## `<ITranslate>` component

For inline use:

```vue
<template>
    <ITranslate path="app.hi" :data="{ name: 'Peter' }" />
    <!-- "Hello, Peter!" -->
</template>
```

`path` is `group.key`. The component is auto-registered by the plugin.

## Accessing the locale

```vue
<script setup>
import { injectLocale } from '@ilingo/vue';

const locale = injectLocale();

function setLocale (next) {
    locale.value = next;
}
</script>

<template>
    <button @click="setLocale('en')">EN</button>
    <button @click="setLocale('de')">DE</button>
</template>
```

`injectLocale()` returns the reactive `Ref<string>` that backs the entire app's translations. Mutating it re-renders every `useTranslation` consumer and every `<ITranslate>` instance.

`injectIlingo()` returns the underlying `Ilingo` instance if you need imperative `await ilingo.get(...)` calls.

## Patterns

### Locale-switcher

```vue
<script setup>
import { injectLocale } from '@ilingo/vue';

const locale = injectLocale();
const locales = [
    { code: 'en', label: 'English' },
    { code: 'de', label: 'Deutsch' },
    { code: 'fr', label: 'Français' },
];
</script>

<template>
    <select v-model="locale">
        <option v-for="l in locales" :key="l.code" :value="l.code">
            {{ l.label }}
        </option>
    </select>
</template>
```

### Loading from disk

Combine with `@ilingo/fs` to lazy-load locales as the user switches languages:

```typescript
import { Ilingo } from 'ilingo';
import { FSStore } from '@ilingo/fs';
import { install } from '@ilingo/vue';

const ilingo = new Ilingo({
    store: new FSStore({ directory: './public/locales' }),
});

install(app, ilingo);
```
