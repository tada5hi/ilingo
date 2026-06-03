# @ilingo/validup-vue

Vue 3 plugin for [`@ilingo/validup`](../validup) — the install hook, five composables, the `<IValidup>` / `<IValidupT>` / `<IFieldValidation>` renderless components, and the `FieldTranslations` / `GroupTranslations` / `FieldValidation` aliases.

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
| `useTranslationsForGroupErrors($v)` | `MaybeRef<Composable<T>>` → reactive `Ref<IssueGroupTranslation[]>`. Translates `$groupErrors` by each group's own `code` **without** descending into children — for whole-form / banner rendering, not per-field. |
| `useFieldValidation(fieldState)` | `MaybeRef<FieldState>` → a **`reactive`** `{ severity, messages, issues }` bundle for one binding onto a form-group host's `:validation` prop. |

All re-run when the injected locale flips. The injected `Ilingo` instance and locale `Ref` come from `@ilingo/vue` — call its `install()` first, then this package's `install(app)` to register the default catalog.

`useTranslationsForIssues` and `useTranslationsForGroupErrors` preserve the previously-resolved translations during async re-evaluation, so a locale switch on a form with visible errors doesn't blank the UI for a tick before the new translations paint.

#### `useFieldValidation`

Collapses the three reactive shims a per-field validation block usually needs (severity, translated messages, reshape) into one binding onto vuecs's [`<VCFormGroup :validation>`](https://github.com/tada5hi/vuecs) prop:

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

`validation` is a `reactive` bundle so its keys auto-unwrap when bound:

- `severity` — `getSeverity(field)` from `@validup/vue` (`undefined` while pristine); the host's `validation-severity`.
- `messages` — `{ key: issue.code ?? 'validation', value: message }[]`; the host's `validation-messages`.
- `issues` — the raw `IssueTranslation[]` escape hatch for consumers that want richer rendering.

> **Call it in `setup()`, not inline in the template.** Like every composable here it wires a `computedAsync` watcher, owned by the effect scope active at call time — the component scope from `setup()` (created once, disposed on unmount), but **no scope at all** on the render path. Calling it inline as `:validation="useFieldValidation(...)"` registers a fresh, never-disposed watcher on every render and hangs the page on typing ([#965](https://github.com/tada5hi/ilingo/issues/965)). For the template-only ergonomic without a `setup()` line, use the [`<IFieldValidation>`](#ifieldvalidation--severity--messages-without-a-setup-line) component below, which owns the lifecycle for you.

### Component

#### `<IFieldValidation>` — severity + messages without a `setup()` line

Renderless companion to `useFieldValidation` for template-only use. Because it is a component, the `useFieldValidation` call (and its watcher) runs in the component's own `setup()` scope — created once, disposed on unmount — so it is the leak-free way to get the bundle straight into the template. Mirrors the `<IValidup>` / `<IValidupT>` renderless pattern. The default scoped slot exposes the bundle as `value` (the name already says "validation"):

```vue
<IFieldValidation :field="$v.fields.email" v-slot="{ value }">
    <VCFormGroup :validation="value">
        <VCFormInput v-model="$v.fields.email.$model" />
    </VCFormGroup>
</IFieldValidation>
```

Without a default slot it renders nothing.

#### `<IValidup>` leaf mode — `:issues`

```vue
<IValidup :issues="$v.fields.email.$errors.value">
    <template #default="{ translations }">
        <li v-for="t in translations" :key="t.issue.code">
            {{ t.message }}
        </li>
    </template>
</IValidup>
```

Without a default slot, renders one text node per translation. With a slot, the consumer receives the `IssueTranslation[]` and renders whatever structure makes sense.

#### `<IValidup>` composable mode — `:composable`

Pass the whole `@validup/vue` `Composable<T>` to render all three error channels it exposes, each via its own named slot:

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

Each stream renders via its slot when provided, else falls back to plain text — so with no slots the component renders all three in order (cross-cutting, groups, fields). `:composable` wins when both props are passed; `:issues` is the leaf shortcut. The `#groups` slot carries `GroupSlotProps` (`{ translations: IssueGroupTranslation[] }`); the others carry `SlotProps`.

#### `<IValidupT>` — component-aware interpolation

Slot-aware sibling of `<IValidup>`, built on `@ilingo/vue`'s `<ITranslateT>`. Lets a validation message carry Vue components inline (`<router-link>`, sign-in `<button>`, help popover) via `{slot}` placeholders in the message.

```vue
<IValidupT :issues="$v.fields.password.$errors.value">
    <template #passwordField="{ issue, code }">
        <router-link :to="`#${issue.data.other}`">{{ issue.data.other }}</router-link>
    </template>
</IValidupT>
```

- **No placeholder slots → text path.** Behaves exactly like `<IValidup :issues>` (text via `useTranslationsForIssues`, preserving the `issue.message` fallback for un-cataloged codes); none of the `<ITranslateT>` cost.
- **Placeholder slots → component path.** Each issue renders through `<ITranslateT path="validup.<code>" :data="issue.data">`; named slots are forwarded as the `{slot}` fillers, each receiving an `IssueSlotProps` `{ issue, code }` scope so the same slot name can render different content per issue. A code-less issue falls back to its raw `message`.

Per-issue element tag follows `<ITranslateT>`'s `tag` prop (default `span`; `tag=""` → fragment). The `locale` prop is honoured on both paths. Forward-compat: useful once messages carry placeholders — the built-in catalog messages are all plain text today.

> **Note on the component path:** because it renders through `<ITranslateT>`, an *un-cataloged* `code` resolves to the literal `"validup.<code>"` (not `issue.message`) — `<ITranslateT>` has no `issue.message` fallback. This is the intended usage boundary: you reach for slot mode precisely for messages that *do* have a catalog entry with placeholders. The text path keeps the `issue.message` fallback. Groups are also not flattened on the component path — pass leaf `$errors`, not raw `$issues`.

### `FieldTranslations` / `GroupTranslations` / `FieldValidation`

`FieldTranslations` is `Ref<IssueTranslation[]>` (leaf composables); `GroupTranslations` is `Ref<IssueGroupTranslation[]>` (`useTranslationsForGroupErrors`); `FieldValidation` is the `reactive` `{ severity, messages, issues }` shape (`useFieldValidation`) consumed by vuecs's `<VCFormGroup :validation>`. Re-exported so consumers can type props without reaching into Vue's `Ref` directly.

## License

MIT © Peter Placzek
