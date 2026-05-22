# Integrations

ilingo ships three first-party adapters. Same core orchestrator, framework-specific wrappers.

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
