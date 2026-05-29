# @ilingo/validup

Translate [validup](https://www.npmjs.com/package/validup) `Issue`s through [ilingo](https://www.npmjs.com/package/ilingo) — default EN / DE / FR / ES catalogs for the built-in `IssueCode`s, a pre-seeded `Store`, and pure `translateIssue` / `translateIssues` helpers.

**No Vue dependency.** Embeddable in any runtime: Node SSR, edge workers, queue handlers, CLI tools. Vue 3 users add [`@ilingo/validup-vue`](../validup-vue) on top for composables, the renderless component, and the install plugin.

## Installation

```bash
npm install @ilingo/validup ilingo validup
```

## Quick start

```typescript
import { Ilingo } from 'ilingo';
import { Store, translateIssue } from '@ilingo/validup';
import { defineIssueItem, IssueCode } from 'validup';

const ilingo = new Ilingo({ locale: 'en' });
ilingo.stores.add(new Store());

const issue = defineIssueItem({
    path: ['email'],
    message: 'The value is invalid',
    code: IssueCode.VALUE_INVALID,
});

const message = await translateIssue(issue, ilingo);
// "The value is invalid" (or the German / French / Spanish form when locale flips)
```

## API

### `Store`

A pre-seeded `MemoryStore` carrying EN / DE / FR / ES translations for the built-in validup `IssueCode`s. Add it to any `Ilingo` instance to make `IssueCode` lookups resolve.

```typescript
import { Ilingo } from 'ilingo';
import { Store, createStore } from '@ilingo/validup';

const ilingo = new Ilingo();
ilingo.stores.add(createStore()); // or `new Store()`
```

### `translateIssue(issue, ilingo, opts?)`

Resolve a single `Issue` (item *or* group) to a localized string. Lookup order is `issue.code` → catalog entry → fall back to `issue.message`, so the UI always renders something even when an extension code isn't in the catalog.

### `translateIssues(issues, ilingo, opts?)`

Flatten an `Issue[]` to its leaf `IssueItem`s and translate each in parallel via `Promise.all`. Useful in SSR template loops, queue workers, log formatters — anywhere outside Vue.

Options on both: `{ locale?: string, group?: string }`. The default group is `'validup'`; override when you've mounted translations under a different name.

### Type-safe catalog composition

The shipped catalog's shape is exported as `ValidupCatalog` for consumers using `Ilingo<Catalog>`:

```typescript
import type { ValidupCatalog } from '@ilingo/validup';
import type { Ilingo } from 'ilingo';

type AppCatalog = {
    en: { app: { greeting: string } } & ValidupCatalog['en'];
    de: { app: { greeting: string } } & ValidupCatalog['de'];
};

const ilingo: Ilingo<AppCatalog> = new Ilingo<AppCatalog>({ /* ... */ });
// ilingo.get({ group: 'validup', key: 'min_length' }) → typed
// ilingo.get({ group: 'validup', key: 'typo' })       → TS error
```

The interface is augmentable so adapter authors / consumers shipping extension `IssueCode`s via `IssueDataByCode` can extend it with their own keys.

### Default catalogs

```typescript
import {
    useEnglishTranslation,
    useGermanTranslation,
    useFrenchTranslation,
    useSpanishTranslation,
} from '@ilingo/validup';
```

Each function returns a `LinesRecord` keyed by the built-in `IssueCode` runtime values. Register your own translations for extension codes by adding a `MemoryStore` *before* this package's `Store` — the serial store walk means the earlier store wins:

```typescript
import { Ilingo, MemoryStore } from 'ilingo';
import { Store } from '@ilingo/validup';

const ilingo = new Ilingo({ locale: 'en' });
ilingo.stores.add(new MemoryStore({
    data: {
        en: { validup: { email_taken: 'That email is already registered' } },
        de: { validup: { email_taken: 'Diese E-Mail ist bereits registriert' } },
    },
}));
ilingo.stores.add(new Store());  // appended second; the closer locale wins
```

The `validup` group name is exported as `GROUP` if you'd rather build the catalog programmatically.

## Going Vue

For composables (`useTranslationsForIssues`, `useTranslationsForField`, `useTranslationsForComposable`), the `<IValidup>` renderless component, and the Vue plugin install hook, add [`@ilingo/validup-vue`](../validup-vue).

## License

Apache-2.0 © Peter Placzek
