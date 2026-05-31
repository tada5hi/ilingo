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
import { translateIssue } from '@ilingo/validup';
import { createMemoryStore } from '@ilingo/validup/store/memory';
import { defineIssueItem, IssueCode } from 'validup';

const ilingo = new Ilingo({ locale: 'en' });
ilingo.registerStore(createMemoryStore()); // EN/DE/FR/ES 'validup' catalog (idempotent)

const issue = defineIssueItem({
    path: ['email'],
    message: 'The value is invalid',
    code: IssueCode.VALUE_INVALID,
});

const message = await translateIssue(issue, ilingo);
// "The value is invalid" (or the German / French / Spanish form when locale flips)
```

## API

The package core (`@ilingo/validup`) is **data-free** — it carries the
`translateIssue(s)` helpers, the `NAMESPACE` / `STORE_ID` constants, and the
catalog types, but no translation modules. The catalog stores live behind
two subpaths so you pay only for the backend you choose.

### `@ilingo/validup/store/memory` — eager

`createMemoryStore()` builds an in-memory store with all four locales
materialised up front, keyed by `STORE_ID`. `Ilingo.registerStore` dedupes
by `store.id`, so registering twice (or from a duplicate package copy) is a
no-op:

```typescript
import { Ilingo } from 'ilingo';
import { createMemoryStore } from '@ilingo/validup/store/memory';
import { STORE_ID } from '@ilingo/validup';

const ilingo = new Ilingo();
ilingo.registerStore(createMemoryStore());
ilingo.registerStore(createMemoryStore()); // no-op — same STORE_ID
ilingo.stores.has(STORE_ID);               // → true
```

This subpath also exports `Store`, `extendStore()`, and the raw per-locale
catalogs (`useEnglishTranslation()` …).

### `@ilingo/validup/store/loader` — lazy

`createLoaderStore()` builds a `LoaderStore` that fetches each locale on
first use via dynamic `import()` — every locale is a separate bundle chunk,
so a browser app ships only the locales it actually renders. Importing this
subpath pulls in *none* of the translation data up front.

```typescript
import { Ilingo } from 'ilingo';
import { createLoaderStore } from '@ilingo/validup/store/loader';

const ilingo = new Ilingo();
ilingo.registerStore(createLoaderStore());
```

`@ilingo/validup-vue`'s install hook registers the **eager** memory store
(Vue apps default to bundling all locales); opt into the loader by skipping
it and registering `createLoaderStore()` yourself.

### `translateIssue(issue, ilingo, opts?)`

Resolve a single `Issue` (item *or* group) to a localized string. Lookup order is `issue.code` → catalog entry → fall back to `issue.message`, so the UI always renders something even when an extension code isn't in the catalog.

### `translateIssues(issues, ilingo, opts?)`

Flatten an `Issue[]` to its leaf `IssueItem`s and translate each in parallel via `Promise.all`. Useful in SSR template loops, queue workers, log formatters — anywhere outside Vue.

Options on both: `{ locale?: string, namespace?: string }`. The default namespace is `'validup'`; override when you've mounted translations under a different name.

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
// ilingo.get({ namespace: 'validup', key: 'min_length' }) → typed
// ilingo.get({ namespace: 'validup', key: 'typo' })       → TS error
```

The interface is augmentable so adapter authors / consumers shipping extension `IssueCode`s via `IssueDataByCode` can extend it with their own keys.

### Default catalogs

```typescript
import {
    useEnglishTranslation,
    useGermanTranslation,
    useFrenchTranslation,
    useSpanishTranslation,
} from '@ilingo/validup/store/memory';
```

Each function returns a `Lines` keyed by the built-in `IssueCode` runtime values. (They live on the `./store/memory` subpath — the eager entry — so the data-free core stays free of translation modules.)

### Extending / overriding the `validup` namespace

The `validup` namespace is a **shared key-space** — it isn't owned solely by this package. ilingo's serial store walk falls through store-by-store *per key*, so an app co-owns the namespace by registering its own store **first**: it adds translations for its custom extension `IssueCode`s and overrides individual built-in messages, while this catalog supplies the defaults for everything else.

```typescript
import { Ilingo, MemoryStore } from 'ilingo';
import { createMemoryStore } from '@ilingo/validup/store/memory';

const ilingo = new Ilingo({ locale: 'en' });

// app store FIRST → wins per (locale, namespace, key)
ilingo.registerStore(new MemoryStore({
    data: {
        en: { validup: {
            email_taken: 'That email is already registered', // custom extension code
            value_invalid: 'Please check this field',         // overrides the built-in
        } },
        de: { validup: { email_taken: 'Diese E-Mail ist bereits registriert' } },
    },
}));

// built-in catalog appended → fills every code the app store doesn't define
ilingo.registerStore(createMemoryStore());
```

The `validup` namespace name is exported as `NAMESPACE` if you'd rather build the catalog programmatically.

## Going Vue

For composables (`useTranslationsForIssues`, `useTranslationsForField`, `useTranslationsForComposable`), the `<IValidup>` renderless component, and the Vue plugin install hook, add [`@ilingo/validup-vue`](../validup-vue).

## License

Apache-2.0 © Peter Placzek
