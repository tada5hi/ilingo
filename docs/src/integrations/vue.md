# Vue

`@ilingo/vue` is a Vue 3 plugin that wires the `Ilingo` instance and a reactive locale `Ref` into your app via `provide` / `inject`.

## Install

```bash
npm install @ilingo/vue
```

## Plugin setup

```typescript
import { install } from '@ilingo/vue';
import { MemoryStore, defineCatalog, defineLocale, defineNamespace, defineTranslations } from 'ilingo';
import { createApp } from 'vue';
import App from './App.vue';

const store = new MemoryStore({
    data: defineCatalog([
        defineLocale('en', [defineNamespace('app', [defineTranslations({ hi: 'Hello, {{name}}!' })])]),
        defineLocale('de', [defineNamespace('app', [defineTranslations({ hi: 'Hallo, {{name}}!' })])]),
    ]),
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
    namespace: 'app',
    key: 'hi',
    data: { name: 'Paul' },
});
const items = useTranslation({
    namespace: 'cart',
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

`path` is `namespace.key`. The component is auto-registered by the plugin.

## `<ITranslateT>` — slot-aware interpolation

For messages that need inline HTML or component fragments (links, bold runs, icons), `<ITranslateT>` extends `<ITranslate>` with **slot placeholders**. Single-curly `{slot}` markers in the message are filled by named scoped slots:

```vue
<template>
    <ITranslateT path="app.welcome" :data="{ user: 'Peter' }">
        <template #cta>
            <a href="/start">get started</a>
        </template>
    </ITranslateT>
    <!-- → <span>Hi Peter, please <a href="/start">get started</a> to continue.</span> -->
</template>
```

Message: `"Hi {{user}}, please {cta} to continue."`. The `{{var}}` placeholders still resolve from `data`; `{slot}` placeholders pull from named scoped slots.

- Default wrapper element is `<span>`; override with `tag="p"`, `tag="div"`, etc. Pass `tag=""` to render a fragment with no wrapper.
- Unfilled slot placeholders stay as literal `{slot}` text — never throws.
- Reacts to `path` prop changes (no stale namespace/key after a dynamic flip).

## `v-t` directive

For elements whose entire `textContent` is a single translation, the `v-t` directive avoids the wrapping component:

```vue
<template>
    <p v-t="'app.greeting'"></p>
    <p v-t="{ path: 'app.greet', data: { name: 'Peter' } }"></p>
    <p v-t="{ namespace: 'cart', key: 'items', count: 3 }"></p>
</template>
```

The directive writes the translation to `el.textContent` and reacts to locale changes — element identity is preserved (no remount on locale flip). In-flight lookups are cancelled when the binding or locale changes again, so a stale translation can't clobber a newer one.

Registered globally by `install()`. Opt out per-app:

```typescript
install(app, { store, directives: false });
```

## `useScopedCatalog` — per-component message scope

Some components (modals, embedded widgets, marketing sections) ship their own strings. `useScopedCatalog` creates a fresh `Ilingo` whose stores resolve scoped messages first, then fall back to the parent app's stores:

```vue
<script setup>
import { useScopedCatalog, useTranslation } from '@ilingo/vue';

// Use `t` in the SAME component — Vue's provide/inject can't reach
// the current setup's own provides.
const { t } = useScopedCatalog({
    messages: {
        en: { modal: { greeting: 'Welcome to the modal!' } },
    },
});

const greeting = t({ namespace: 'modal', key: 'greeting' });
</script>
```

Descendant components can use plain `useTranslation` — they receive the scoped instance via inject. Siblings outside the subtree continue to see the parent's stores. On unmount, the scoped instance becomes unreachable and is garbage-collected.

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
