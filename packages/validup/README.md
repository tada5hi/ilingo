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
import { register, translateIssue } from '@ilingo/validup';
import { defineIssueItem, IssueCode } from 'validup';

const ilingo = new Ilingo({ locale: 'en' });
register(ilingo); // registers the EN/DE/FR/ES 'validup' catalog (idempotent)

const issue = defineIssueItem({
    path: ['email'],
    message: 'The value is invalid',
    code: IssueCode.VALUE_INVALID,
});

const message = await translateIssue(issue, ilingo);
// "The value is invalid" (or the German / French / Spanish form when locale flips)
```

## API

### `register(ilingo)` / `STORE_ID`

The ergonomic, framework-agnostic entry point. Registers the default `Store` on any `IIlingo` instance, idempotently — keyed by `STORE_ID` (`Symbol.for('@ilingo/validup')`), so calling it twice (or from a duplicate package copy) never stacks duplicates. Returns `true` if it added the catalog, `false` if it was already present.

```typescript
import { Ilingo } from 'ilingo';
import { register, STORE_ID } from '@ilingo/validup';

const ilingo = new Ilingo();
register(ilingo);                 // → true
register(ilingo);                 // → false (already registered)
ilingo.stores.has(STORE_ID);      // → true
```

`@ilingo/validup-vue`'s install hook delegates to this same function, so the Vue and non-Vue paths share one definition of "is the catalog present".

### `Store` / `createStore()`

The underlying pre-seeded `MemoryStore` carrying EN / DE / FR / ES translations for the built-in validup `IssueCode`s. Prefer `register(ilingo)` above; reach for these when you need direct control over the store's identity or ordering:

```typescript
import { Ilingo } from 'ilingo';
import { createStore, STORE_ID } from '@ilingo/validup';

const ilingo = new Ilingo();
ilingo.register(createStore(), STORE_ID); // exactly what register(ilingo) does
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

Each function returns a `LinesRecord` keyed by the built-in `IssueCode` runtime values.

### Extending / overriding the `validup` group

The `validup` group is a **shared key-space** — it isn't owned solely by this package. ilingo's serial store walk falls through store-by-store *per key*, so an app co-owns the group by registering its own store **first**: it adds translations for its custom extension `IssueCode`s and overrides individual built-in messages, while this catalog supplies the defaults for everything else.

```typescript
import { Ilingo, MemoryStore } from 'ilingo';
import { register } from '@ilingo/validup';

const ilingo = new Ilingo({ locale: 'en' });

// app store FIRST → wins per (locale, group, key)
ilingo.register(new MemoryStore({
    data: {
        en: { validup: {
            email_taken: 'That email is already registered', // custom extension code
            value_invalid: 'Please check this field',         // overrides the built-in
        } },
        de: { validup: { email_taken: 'Diese E-Mail ist bereits registriert' } },
    },
}));

// built-in catalog appended → fills every code the app store doesn't define
register(ilingo);
```

The `validup` group name is exported as `GROUP` if you'd rather build the catalog programmatically.

## Going Vue

For composables (`useTranslationsForIssues`, `useTranslationsForField`, `useTranslationsForComposable`), the `<IValidup>` renderless component, and the Vue plugin install hook, add [`@ilingo/validup-vue`](../validup-vue).

## License

Apache-2.0 © Peter Placzek
