# @ilingo/validup-vue

Vue 3 plugin for [`@ilingo/validup`](../validup) — the install hook, three composables, the `<IValidup>` renderless component, and the `FieldTranslations` `Ref` alias.

Sibling of [`@ilingo/vue`](../vue) and [`@ilingo/vuelidate`](../vuelidate); mirrors the `validup` → `@validup/vue` package split so the framework-agnostic validation-message surface (`@ilingo/validup`) stays free of Vue.

## Installation

```bash
npm install @ilingo/validup-vue @ilingo/validup @ilingo/vue ilingo validup @validup/vue vue
```

## Quick start

```vue
<script setup lang="ts">
import { Container, defineIssueItem, IssueCode } from 'validup';
import { useValidup } from '@validup/vue';
import { useTranslationsForField } from '@ilingo/validup-vue';
import { reactive } from 'vue';

const formState = reactive({ email: '' });
const container = new Container<{ email: string }>();
// container.mount('email', isString) ...

const $v = useValidup(container, formState);
const emailErrors = useTranslationsForField($v.fields.email);
</script>

<template>
    <input v-model="$v.fields.email.$model" />
    <small v-for="t in emailErrors" :key="t.issue.code">{{ t.message }}</small>
</template>
```

Main entry plumbing (`app.use` order matters — `@ilingo/vue` first):

```typescript
import { createApp } from 'vue';
import { install as installIlingo } from '@ilingo/vue';
import { install as installIlingoValidup } from '@ilingo/validup-vue';
import App from './App.vue';

const app = createApp(App);
installIlingo(app, { locale: 'en' });
installIlingoValidup(app);  // looks up the Ilingo from @ilingo/vue
app.mount('#app');
```

## API

### Vue plugin

```typescript
import { install } from '@ilingo/validup-vue';

install(app);
```

Looks up the `Ilingo` instance previously installed by `@ilingo/vue` and registers the default `Store` (from `@ilingo/validup`) onto it. Throws a pointed error when called without a pre-installed `Ilingo` — better than silently constructing a second instance that `<ITranslate>` and `useTranslation()` wouldn't see. Idempotent: re-calling won't stack duplicate `Store` instances.

### Composables

| Export | What it does |
|--------|--------------|
| `useTranslationsForIssues(issues)` | `MaybeRefOrGetter<Issue[]>` → reactive `Ref<IssueTranslation[]>`. Flattens to leaves and translates each. |
| `useTranslationsForField(fieldState)` | `MaybeRef<FieldState>` from `@validup/vue` → reactive translations of the field's dirty-gated `$errors`. |
| `useTranslationsForComposable($v)` | `MaybeRef<Composable<T>>` from `@validup/vue` → reactive translations of every field's `$errors`. |

All three re-run when the injected locale flips. The injected `Ilingo` instance and locale `Ref` come from `@ilingo/vue` — call its `install()` first, then this package's `install(app)` to register the default catalog.

`useTranslationsForIssues` preserves the previously-resolved translations during async re-evaluation, so a locale switch on a form with visible errors doesn't blank the UI for a tick before the new translations paint.

### Component

```vue
<IValidup :issues="$v.fields.email.$issues.value">
    <template #default="{ translations }">
        <li v-for="t in translations" :key="t.issue.code">
            {{ t.message }}
        </li>
    </template>
</IValidup>
```

Without a default slot, renders one text node per translation. With a slot, the consumer receives the `IssueTranslation[]` and renders whatever structure makes sense.

### `FieldTranslations`

`Ref<IssueTranslation[]>` — the reactive shape returned by every composable above. Re-exported so consumers can type props without reaching into Vue's `Ref` directly.

## License

Apache-2.0 © Peter Placzek
