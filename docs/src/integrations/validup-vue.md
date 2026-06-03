# Validup (Vue)

`@ilingo/validup-vue` is the Vue 3 layer for [`@ilingo/validup`](./validup) — the install hook, five composables, the renderless `<IValidup>` / `<IValidupT>` components, and the `FieldTranslations` / `GroupTranslations` / `FieldValidation` type aliases. It mirrors the `validup` → [`@validup/vue`](https://www.npmjs.com/package/@validup/vue) package split so the framework-agnostic message surface stays free of Vue.

## Install

```bash
npm install @ilingo/validup-vue @ilingo/validup @ilingo/vue ilingo validup @validup/vue vue
```

Peer dependencies: `@ilingo/validup`, `@ilingo/vue`, `ilingo`, `vue`, `@vueuse/core`, `validup`, `@validup/vue`.

## Plugin setup

**Order matters** — install `@ilingo/vue` first, then `@ilingo/validup-vue`. The latter looks up the `Ilingo` instance the former provided and registers the default validator catalog on it; called without a pre-installed instance it throws (rather than silently creating a second instance `<ITranslate>` wouldn't see).

```typescript
import { createApp } from 'vue';
import { install as installIlingo } from '@ilingo/vue';
import { install as installIlingoValidup } from '@ilingo/validup-vue';
import App from './App.vue';

const app = createApp(App);
installIlingo(app, { locale: 'en' });
installIlingoValidup(app);  // registers the EN/DE/FR/ES 'validup' catalog
app.mount('#app');
```

`install(app)` is idempotent — re-calling it never stacks duplicate stores (`registerStore` dedupes by `STORE_ID`). It registers the **eager** memory store; for per-locale code-splitting, skip it and register `createLoaderStore()` from `@ilingo/validup/store/loader` on the instance you pass to `@ilingo/vue`.

## Composables

| Composable | Input → output |
|---|---|
| `useTranslationsForIssues(issues, localeOverride?)` | `MaybeRefOrGetter<Issue[]>` → `Ref<IssueTranslation[]>`. Flattens to leaves and translates each. |
| `useTranslationsForField(fieldState)` | `MaybeRef<FieldState>` → reactive translations of the field's dirty-gated `$errors`. |
| `useTranslationsForComposable($v)` | `MaybeRef<Composable<T>>` → reactive translations of every field's `$errors`. |
| `useTranslationsForGroupErrors($v)` | `MaybeRef<Composable<T>>` → `Ref<IssueGroupTranslation[]>`. Translates `$groupErrors` by each group's own `code`, **without** flattening children. |
| `useFieldValidation(fieldState)` | `MaybeRef<FieldState>` → a `reactive` `{ severity, messages, issues }` bundle for vuecs's `<VCFormGroup :validation>`. |

All re-run when the injected locale flips. `useTranslationsForIssues` and `useTranslationsForGroupErrors` keep the previously-resolved batch visible during an async re-run, so a locale switch on a form with visible errors doesn't blank the UI for a tick.

### Per-field errors

```vue
<script setup lang="ts">
import { Container } from 'validup';
import { useValidup } from '@validup/vue';
import { useTranslationsForField } from '@ilingo/validup-vue';
import { reactive } from 'vue';

const formState = reactive({ email: '' });
const container = new Container<{ email: string }>();
// container.mount('email', isEmail) ...

const $v = useValidup(container, formState);
const emailErrors = useTranslationsForField($v.fields.email);
</script>

<template>
    <input v-model="$v.fields.email.$model" />
    <small v-for="t in emailErrors" :key="t.issue.code">{{ t.message }}</small>
</template>
```

### Group errors

`$groupErrors` carries top-level `IssueGroup`s — e.g. `ONE_OF_FAILED` wrapping a `oneOf` container. They usually mean "the form's shape is wrong" and want their own banner, not per-field rendering. `useTranslationsForGroupErrors` translates each group by its own `code` without descending into its children (`useTranslationsForIssues(() => $v.$groupErrors.value)` would flatten into the per-branch leaves — not what banner rendering wants).

```vue
<script setup lang="ts">
import { useTranslationsForGroupErrors } from '@ilingo/validup-vue';
const groupErrors = useTranslationsForGroupErrors($v);
</script>

<template>
    <div v-if="groupErrors.length" class="form-banner">
        <p v-for="t in groupErrors" :key="t.issue.code">{{ t.message }}</p>
    </div>
</template>
```

### `useFieldValidation` — severity + messages in one bind

Collapses the three reactive shims a per-field validation block usually needs (severity, translated messages, reshape) into one binding onto vuecs's `<VCFormGroup :validation>` prop. The return value is a `reactive` bundle, so its keys auto-unwrap when bound:

```vue
<script setup lang="ts">
import { useFieldValidation } from '@ilingo/validup-vue';
const validation = useFieldValidation($v.fields.email);
</script>

<template>
    <VCFormGroup :validation="validation">
        <VCFormInput v-model="$v.fields.email.$model" />
    </VCFormGroup>
</template>
```

- `severity` — `getSeverity(field)` from `@validup/vue` (dirty / pending / optional aware; `undefined` while pristine); the host's `validation-severity`.
- `messages` — `{ key: issue.code ?? 'validation', value: message }[]`; the host's `validation-messages`.
- `issues` — the raw `IssueTranslation[]` escape hatch for richer rendering.

::: tip Safe to call inline in the template
You can also call it directly in the binding — `<VCFormGroup :validation="useFieldValidation($v.fields.email)">` — without declaring `validation` in `setup()`. The bundle is **memoized per `FieldState` identity**: `@validup/vue` hands out a stable field object per `(form, path)`, so repeated calls across renders return the *same* bundle and the underlying async watcher is registered exactly once (lives for the component's lifetime, like a `setup()`-level call). Without that memoization, an inline call would leak a fresh watcher every render and hang the page on typing — see [issue #965](https://github.com/tada5hi/ilingo/issues/965).
:::

## `<IValidup>` — renderless component

### Leaf mode — `:issues`

```vue
<IValidup :issues="$v.fields.email.$errors.value">
    <template #default="{ translations }">
        <li v-for="t in translations" :key="t.issue.code">{{ t.message }}</li>
    </template>
</IValidup>
```

Without a default slot, renders one text node per translation. With a slot, the consumer receives the `IssueTranslation[]`.

### Composable mode — `:composable`

Pass the whole `@validup/vue` `Composable<T>` to render all three error channels it exposes, each via a named slot:

```vue
<IValidup :composable="$v">
    <template #cross-cutting="{ translations }">
        <!-- path-less $crossCuttingErrors (CSRF, rate-limit, schema-level) -->
    </template>
    <template #groups="{ translations }">
        <!-- $groupErrors, e.g. ONE_OF_FAILED — translated by group code -->
    </template>
    <template #fields="{ translations }">
        <li v-for="t in translations" :key="t.issue.path.join('.')">{{ t.message }}</li>
    </template>
</IValidup>
```

Each stream renders via its slot when provided, else falls back to plain text — so with **no** slots the component renders all three in order (cross-cutting, groups, fields). `:composable` wins when both props are passed; `:issues` is the leaf shortcut. The `#groups` slot carries `GroupSlotProps` (`{ translations: IssueGroupTranslation[] }`); the others carry `SlotProps`.

## `<IValidupT>` — component-aware interpolation

Slot-aware sibling of `<IValidup>`, built on [`<ITranslateT>`](./vue). Lets a validation message carry Vue components inline (a `<router-link>` to the referenced field, a sign-in `<button>`, a help popover) via `{slot}` placeholders in the message:

```vue
<IValidupT :issues="$v.fields.password.$errors.value">
    <template #passwordField="{ issue, code }">
        <router-link :to="`#${issue.data.other}`">{{ issue.data.other }}</router-link>
    </template>
</IValidupT>
```

- **No placeholder slots → text path.** Behaves exactly like `<IValidup :issues>` (preserving the `issue.message` fallback for un-cataloged codes); none of the `<ITranslateT>` cost.
- **Placeholder slots → component path.** Each issue renders through `<ITranslateT path="validup.<code>" :data="issue.data">`; named slots are forwarded as `{slot}` fillers, each receiving an `IssueSlotProps` `{ issue, code }` scope so the same slot name can render different content per issue.

The `locale` prop is honoured on both paths; per-issue element tag follows `<ITranslateT>`'s `tag` prop (default `span`).

::: tip Usage boundary
The component path renders through `<ITranslateT>`, which has no `issue.message` fallback — an *un-cataloged* `code` resolves to the literal `"validup.<code>"`. Reach for slot mode only for messages that **do** have a catalog entry with placeholders; the text path keeps the `issue.message` fallback. Groups are not flattened on the component path — pass leaf `$errors`, not raw `$issues`.
:::

This is **forward-compat**: useful once a message carries a component placeholder. Every built-in catalog message is plain text today.

## Type aliases

| Alias | Shape | Produced by |
|---|---|---|
| `FieldTranslations` | `Ref<IssueTranslation[]>` | the leaf composables |
| `GroupTranslations` | `Ref<IssueGroupTranslation[]>` | `useTranslationsForGroupErrors` |
| `FieldValidation` | `reactive` `{ severity, messages, issues }` | `useFieldValidation` |

Re-exported so consumers can type props without reaching into Vue's `Ref` directly.

## Locale switching

Use `injectLocale()` from `@ilingo/vue` — every composable above re-renders reactively when the locale changes:

```vue
<script setup lang="ts">
import { injectLocale } from '@ilingo/vue';
const locale = injectLocale();
</script>

<template>
    <button @click="locale = 'de'">DE</button>
    <button @click="locale = 'en'">EN</button>
</template>
```
