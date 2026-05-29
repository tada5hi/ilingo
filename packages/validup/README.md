# @ilingo/validup 🌍🛡️

Translate [validup](https://www.npmjs.com/package/validup) `Issue`s through [ilingo](https://www.npmjs.com/package/ilingo) — default EN / DE / FR / ES catalogs for the built-in `IssueCode`s, a Vue plugin for one-line install, and reactive composables that drop straight into a `@validup/vue` form.

The sibling of [`@ilingo/vuelidate`](https://www.npmjs.com/package/@ilingo/vuelidate) — same pattern, same install shape, same composable ergonomics, just keyed by validup `IssueCode` instead of vuelidate rule names.

## Installation

```bash
npm install @ilingo/validup ilingo validup @ilingo/vue @validup/vue vue
```

| Peer dependency  | Supported versions |
|------------------|--------------------|
| `ilingo`         | `^5.0.0`           |
| `validup`        | `^1.0.0`           |
| `@ilingo/vue`    | `^5.0.0`           |
| `@validup/vue`   | `^1.0.0`           |
| `@vueuse/core`   | `^14.1.0`          |
| `vue`            | `^3.5.26`          |

## Quick Start

```typescript
import { createApp } from 'vue';
import { install as installIlingo } from '@ilingo/vue';
import { install as installIlingoValidup } from '@ilingo/validup';
import App from './App.vue';

const app = createApp(App);

// `@ilingo/vue` provides the Ilingo instance + reactive locale.
installIlingo(app, { locale: 'en' });

// `@ilingo/validup` adds the validup translation Store on top.
installIlingoValidup(app);

app.mount('#app');
```

In any setup block, use the composables to render translated messages for a `@validup/vue` form:

```vue
<script setup lang="ts">
import { reactive } from 'vue';
import { Container } from 'validup';
import { createValidator } from '@validup/zod';
import { useValidup, getSeverity } from '@validup/vue';
import { useTranslationsForField } from '@ilingo/validup';
import { z } from 'zod';

const container = new Container<{ email: string }>();
container.mount('email', createValidator(z.string().email()));

const form = reactive({ email: '' });
const $v = useValidup(container, form);

// Reactive Ref<IssueTranslation[]> — recomputes on locale / state change.
const emailErrors = useTranslationsForField($v.fields.email);
</script>

<template>
    <input v-model="$v.fields.email.$model" :class="getSeverity($v.fields.email)" />
    <small v-for="t in emailErrors" :key="t.issue.code">{{ t.message }}</small>
</template>
```

## API

### Vue plugin

```typescript
import { install as installIlingoVue } from '@ilingo/vue';
import { install as installIlingoValidup } from '@ilingo/validup';

installIlingoVue(app, ilingo);     // first — owns the Ilingo instance
installIlingoValidup(app);         // then — registers the validation catalog
```

`@ilingo/validup`'s `install(app)` looks up the `Ilingo` instance previously installed by `@ilingo/vue` and adds the default `Store` (EN / DE / FR / ES translations for the built-in validup `IssueCode`s) if one isn't already present. It throws a pointed error when called without a pre-installed instance — better than silently constructing a second one that `<ITranslate>` and `useTranslation()` wouldn't see. Identity-checked via `instanceof Store`, so re-invoking is idempotent (handy for HMR / test setup).

### Type-safe catalog composition

The shipped catalog's shape is exported as `ValidupCatalog` for consumers using `Ilingo<Catalog>` to compose validation messages into their app catalog:

```typescript
import type { ValidupCatalog } from '@ilingo/validup';
import type { Ilingo } from 'ilingo';

type AppCatalog = {
    en: { app: { greeting: string } } & ValidupCatalog['en'];
    de: { app: { greeting: string } } & ValidupCatalog['de'];
};

const ilingo: Ilingo<AppCatalog> = new Ilingo<AppCatalog>({ ... });
// ilingo.get({ group: 'validup', key: 'min_length' }) → typed
// ilingo.get({ group: 'validup', key: 'typo' })       → TS error
```

Augment `ValidupCatalog` to add locales or extension `IssueCode`s — see the JSDoc on the exported `ValidupCatalogEntries` and `ValidupCatalog` interfaces.

### Composables

| Export | What it does |
|--------|--------------|
| `useTranslationsForIssues(issues)` | `MaybeRefOrGetter<Issue[]>` → reactive `Ref<IssueTranslation[]>`. Flattens to leaves and translates each. |
| `useTranslationsForField(fieldState)` | `MaybeRef<FieldState>` from `@validup/vue` → reactive translations of the field's dirty-gated `$errors`. |
| `useTranslationsForComposable($v)` | `MaybeRef<Composable<T>>` from `@validup/vue` → reactive translations of every field's `$errors`. |

All three re-run when the injected locale flips. The injected `Ilingo` instance and locale `Ref` come from `@ilingo/vue`'s `install()` — call that first, then this package's `install(app)` to register the default catalog.

`useTranslationsForIssues` preserves the previously-resolved translations during async re-evaluation, so a locale switch on a form with visible errors doesn't blank the UI for a tick before the new translations paint.

### Pure helpers (no Vue dep)

```typescript
import { translateIssue, translateIssues } from '@ilingo/validup';
```

`translateIssue(issue, ilingo, opts?)` resolves a single `Issue` (item *or* group) to a localized string. The lookup order is `issue.code` → catalog entry → fall back to `issue.message` so the UI always renders something even when an extension code isn't in the catalog.

`translateIssues(issues, ilingo, opts?)` flattens an `Issue[]` to its leaf `IssueItem`s and translates each — useful in non-Vue contexts (SSR template loops, queue workers, log formatters).

Options: `{ locale?: string, group?: string }`. The default group is `'validup'` (the group used by `Store`); override when you've mounted translations under a different name.

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

### Default catalogs

```typescript
import {
    useEnglishTranslation,
    useGermanTranslation,
    useFrenchTranslation,
    useSpanishTranslation,
} from '@ilingo/validup';
```

The four shipped catalogs cover only the two built-in validup `IssueCode`s — `value_invalid` and `one_of_failed`. Register your own translations for extension codes by adding a `MemoryStore` *before* this package's `Store`:

```typescript
import { Ilingo, MemoryStore } from 'ilingo';

const ilingo = new Ilingo({ locale: 'en' });
ilingo.stores.add(new MemoryStore({
    data: {
        en: { validup: { email_taken: 'That email is already registered' } },
        de: { validup: { email_taken: 'Diese E-Mail ist bereits registriert' } },
    },
}));
// installIlingoVue(app, ilingo); installIlingoValidup(app);
// the default Store appends second; the closer locale wins.
```

The `validup` group name is exported as `GROUP` if you'd rather build the catalog programmatically.

## License

Apache-2.0 © Peter Placzek
