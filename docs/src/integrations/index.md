# Integrations

ilingo ships first-party adapters for the file system, Vue, and two validation ecosystems. Same core orchestrator, framework-specific wrappers.

## [@ilingo/fs](./fs) — File system

Lazy-loads translations from disk. Supports `.ts`, `.mts`, `.js`, `.mjs`, `.cjs`, `.json`, and `.conf`. Persists `set()` calls atomically as JSON.

```typescript
import { Ilingo } from 'ilingo';
import { FSStore } from '@ilingo/fs';

const ilingo = new Ilingo({
    store: new FSStore({ directory: './locales' }),
});
```

## [@ilingo/vue](./vue) — Vue 3 plugin

`provide` / `inject` for the `Ilingo` instance and a reactive locale `Ref`. Ships an `<ITranslate>` component and a `useTranslation` composable.

```typescript
import { install } from '@ilingo/vue';
import { createApp } from 'vue';

const app = createApp(/* ... */);
install(app, { store });
app.mount('#app');
```

## [@ilingo/vuelidate](./vuelidate) — Vuelidate validator messages

Drop-in validator translations for [Vuelidate](https://vuelidate.js.org). Ships built-in EN / DE / FR / ES message bundles plus composables that wire Vuelidate's `$errors` shape into ilingo.

```typescript
import { install } from '@ilingo/vuelidate';

install(app);
```

## [@ilingo/validup](./validup) — Validup validator messages

Framework-agnostic bridge from [validup](https://www.npmjs.com/package/validup) `Issue`s to ilingo. Built-in EN / DE / FR / ES catalogs and pure `translateIssue` / `translateIssues` / `translateIssueGroups` helpers — no Vue, embeddable in Node SSR, edge, and workers.

```typescript
import { Ilingo } from 'ilingo';
import { translateIssue } from '@ilingo/validup';
import { createMemoryStore } from '@ilingo/validup/store/memory';

const ilingo = new Ilingo();
ilingo.registerStore(createMemoryStore());

const message = await translateIssue(issue, ilingo);
```

## [@ilingo/validup-vue](./validup-vue) — Validup in Vue

The Vue 3 layer for `@ilingo/validup`: an install hook, five composables (per-field, group, and `useFieldValidation`), and the renderless `<IValidup>` / `<IValidupT>` / `<IFieldValidation>` components.

```typescript
import { install as installIlingo } from '@ilingo/vue';
import { install as installIlingoValidup } from '@ilingo/validup-vue';

installIlingo(app, { locale: 'en' });
installIlingoValidup(app);
```
