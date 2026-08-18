<p align="center">
    <img src="https://raw.githubusercontent.com/tada5hi/ilingo/HEAD/packages/validup/assets/logo.svg" alt="@ilingo/validup" width="128" height="128" />
</p>

<h1 align="center">@ilingo/validup</h1>

<p align="center">
    <b>Translate <a href="https://www.npmjs.com/package/validup">validup</a> <code>Issue</code>s through <a href="https://www.npmjs.com/package/ilingo">ilingo</a>: framework-agnostic, with default EN / DE / FR / ES catalogs for the built-in <code>IssueCode</code>s.</b>
</p>

[![npm version](https://img.shields.io/npm/v/@ilingo/validup.svg)](https://www.npmjs.com/package/@ilingo/validup)
[![npm downloads](https://img.shields.io/npm/dm/@ilingo/validup.svg)](https://www.npmjs.com/package/@ilingo/validup)
[![minzipped size](https://img.shields.io/bundlephobia/minzip/@ilingo/validup)](https://bundlephobia.com/package/@ilingo/validup)
[![main](https://github.com/tada5hi/ilingo/actions/workflows/main.yml/badge.svg)](https://github.com/tada5hi/ilingo/actions/workflows/main.yml)
[![Conventional Commits](https://img.shields.io/badge/Conventional%20Commits-1.0.0-%23FE5196?logo=conventionalcommits&logoColor=white)](https://conventionalcommits.org)

Ships default EN / DE / FR / ES catalogs for the built-in `IssueCode`s, a pre-seeded `Store`, and pure `translateIssue` / `translateIssues` helpers (each with a synchronous `…Sync` variant for SSR).

**No Vue dependency.** Embeddable in any runtime: Node SSR, edge workers, queue handlers, CLI tools. Vue 3 users add [`@ilingo/validup-vue`](../validup-vue) on top for composables, the renderless component, and the install plugin.

## Installation

```bash
npm install @ilingo/validup ilingo validup @ebec/core
```

## Quick start

```typescript
import { Ilingo } from 'ilingo';
import { translateIssue } from '@ilingo/validup';
import { createMemoryStore } from '@ilingo/validup/store/memory';
import { defineIssueItem, IssueCode } from '@ebec/core';

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

The package core (`@ilingo/validup`) is **data-free**: it carries the
`translateIssue(s)` helpers, the `NAMESPACE` / `STORE_ID` constants, and the
catalog types, but no translation modules. The catalog stores live behind
two subpaths so you pay only for the backend you choose.

### `@ilingo/validup/store/memory`: eager

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
ilingo.registerStore(createMemoryStore()); // no-op, same STORE_ID
ilingo.stores.has(STORE_ID);               // → true
```

This subpath also exports `Store`, `extendStore()`, and the raw per-locale
catalogs (`en`, `de`, `fr`, `es`, each a `TranslationsNode`).

### `@ilingo/validup/store/loader`: lazy

`createLoaderStore()` builds a `LoaderStore` that fetches each locale on
first use via dynamic `import()`. Every locale is a separate bundle chunk,
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

Flatten an `Issue[]` to its leaf `IssueItem`s and translate each in parallel via `Promise.all`. Useful in SSR template loops, queue workers, log formatters, anywhere outside Vue. Returns `IssueTranslation[]` (`{ issue, message }`).

### `translateIssueGroups(groups, ilingo, opts?)`

Translate an `IssueGroup[]`, each by its **own** `code` (e.g. `one_of_failed`), **without** descending into the group's children. The group-level counterpart to `translateIssues`: where that flattens to per-field leaves, this keeps each group intact for whole-form / banner rendering ("none of the alternatives validated"). Returns `IssueGroupTranslation[]` (`{ issue, message }`, where `issue` is the `IssueGroup`).

### `translateIssueSync` / `translateIssuesSync` / `translateIssueGroupsSync`

Synchronous counterparts of the three helpers above, for call sites that need a message *now*: a server render, or seeding a Vue `computedAsync` so its first render isn't empty ([#988](https://github.com/tada5hi/ilingo/issues/988)). They read through [`Ilingo.getSync()`](../ilingo/README.md#synchronous-reads-for-ssr), so they answer whenever the catalog is in memory (the bundled `createMemoryStore()`) and **return `undefined`** only when a store would need I/O:

```typescript
import { translateIssuesSync } from '@ilingo/validup';

const seed = translateIssuesSync(error.issues, ilingo, { locale: 'de' });
const messages = seed ?? await translateIssues(error.issues, ilingo, { locale: 'de' });
```

An untranslated code is **not** a reason to decline: `getSync()` reports it as a definite miss (`undefined`), so the helper applies the async path's own `issue.message` fallback and the message is identical either way. Declining is reserved for what `getSync()` signals by *throwing* (a store that would need I/O), where falling back would be wrong, because the async helper is about to resolve a real translation and the message would visibly change (across an SSR boundary, a hydration mismatch). An unexpected fault in a store or formatter is re-thrown, never masked as "unavailable".

The batch helpers are **all-or-nothing**: `translateIssuesSync` / `translateIssueGroupsSync` return the complete batch or `undefined`, never a half-translated array. In practice that is rarely partial now: the only cause is a store needing I/O, which applies to every issue equally. An issue with no `code` is always answerable (the async path returns `issue.message` without consulting ilingo).

Options on all six: `{ locale?: string, namespace?: string }`. The default namespace is `'validup'`; override when you've mounted translations under a different name.

### Default catalogs

```typescript
import { en, de, fr, es } from '@ilingo/validup/store/memory';
```

Each is a `TranslationsNode` (`defineTranslations(...)`, i.e. `{ type: 'translations', data }`) keyed by the built-in `IssueCode` runtime values. (They live on the `./store/memory` subpath, the eager entry, so the data-free core stays free of translation modules.)

### Extending / overriding the `validup` namespace

The `validup` namespace is a **shared key-space**: it isn't owned solely by this package. ilingo's serial store walk falls through store-by-store *per key*, so an app co-owns the namespace by registering its own store **first**: it adds translations for its custom extension `IssueCode`s and overrides individual built-in messages, while this catalog supplies the defaults for everything else.

```typescript
import { Ilingo, MemoryStore, defineCatalog, defineLocale, defineNamespace, defineTranslations } from 'ilingo';
import { createMemoryStore } from '@ilingo/validup/store/memory';

const ilingo = new Ilingo({ locale: 'en' });

// app store FIRST → wins per (locale, namespace, key)
ilingo.registerStore(new MemoryStore({
    data: defineCatalog([
        defineLocale('en', [
            defineNamespace('validup', [
                defineTranslations({
                    email_taken: 'That email is already registered', // custom extension code
                    value_invalid: 'Please check this field',        // overrides the built-in
                }),
            ]),
        ]),
        defineLocale('de', [
            defineNamespace('validup', [
                defineTranslations({ email_taken: 'Diese E-Mail ist bereits registriert' }),
            ]),
        ]),
    ]),
}));

// built-in catalog appended → fills every code the app store doesn't define
ilingo.registerStore(createMemoryStore());
```

The `validup` namespace name is exported as `NAMESPACE` if you'd rather build the catalog programmatically.

## Going Vue

For composables (`useTranslationsForIssues`, `useTranslationsForField`, `useTranslationsForComposable`, `useTranslationsForGroupErrors`, `useFieldValidation`), the `<IValidup>` / `<IValidupT>` / `<IFieldValidation>` renderless components, and the Vue plugin install hook, add [`@ilingo/validup-vue`](../validup-vue).

## License

MIT © Peter Placzek
