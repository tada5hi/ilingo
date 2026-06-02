# Validup

`@ilingo/validup` bridges [validup](https://www.npmjs.com/package/validup) `Issue`s to ilingo lookups. It ships built-in validator-message catalogs for **EN / DE / FR / ES** and pure `translateIssue` / `translateIssues` / `translateIssueGroups` helpers.

It is **framework-agnostic** — no Vue dependency. Embeddable in Node SSR, edge workers, queue handlers, and CLI tools. Vue 3 users add [`@ilingo/validup-vue`](./validup-vue) on top for composables and components.

## Install

```bash
npm install @ilingo/validup ilingo validup
```

`ilingo` and `validup` are peer dependencies.

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
// "The value is invalid" (or the DE / FR / ES form when the locale flips)
```

## Data-free core, two store subpaths

The package entry (`@ilingo/validup`) is **data-free** — it carries the helpers and the `NAMESPACE` / `STORE_ID` constants, but imports **no** translation modules. The catalogs live behind two subpaths so you pay only for the backend you choose. Register either with `ilingo.registerStore(store)`, which dedupes by the store's `STORE_ID` identity.

### `@ilingo/validup/store/memory` — eager

All four locales materialised up front. The right choice for most server and bundled-app targets.

```typescript
import { Ilingo } from 'ilingo';
import { createMemoryStore } from '@ilingo/validup/store/memory';
import { STORE_ID } from '@ilingo/validup';

const ilingo = new Ilingo();
ilingo.registerStore(createMemoryStore());
ilingo.registerStore(createMemoryStore()); // no-op — same STORE_ID
ilingo.stores.has(STORE_ID);               // → true
```

This subpath also exports `Store`, `extendStore()`, and the raw per-locale catalogs (`en`, `de`, `fr`, `es` — each a `Translations` node).

### `@ilingo/validup/store/loader` — lazy

Fetches each locale on first use via dynamic `import()` — every locale is a separate bundle chunk, so a browser app ships only the locales it renders. Importing this subpath pulls in *no* translation data up front.

```typescript
import { Ilingo } from 'ilingo';
import { createLoaderStore } from '@ilingo/validup/store/loader';

const ilingo = new Ilingo();
ilingo.registerStore(createLoaderStore());
```

## Helpers

| Helper | Returns | Use |
|---|---|---|
| `translateIssue(issue, ilingo, opts?)` | `Promise<string>` | One `Issue` (item *or* group). `code` → catalog entry → falls back to `issue.message`. |
| `translateIssues(issues, ilingo, opts?)` | `Promise<IssueTranslation[]>` | Flattens an `Issue[]` to leaf `IssueItem`s and translates each (parallel). Per-field rendering. |
| `translateIssueGroups(groups, ilingo, opts?)` | `Promise<IssueGroupTranslation[]>` | Translates each `IssueGroup` by its **own** `code` (e.g. `one_of_failed`), **without** descending into children. Whole-form / banner rendering. |

Options on all three: `{ locale?: string, namespace?: string }`. The default namespace is `'validup'`; override when you've mounted translations under a different name.

```typescript
import { translateIssues, translateIssueGroups } from '@ilingo/validup';

// per-field leaves
const leaves = await translateIssues(error.issues, ilingo, { locale: 'de' });
// → [{ issue, message }, …]

// group banners (e.g. "none of the alternatives validated")
const groups = await translateIssueGroups(groupIssues, ilingo);
// → [{ issue, message }, …]  (issue is the IssueGroup, not its children)
```

## Extending / overriding the `validup` namespace

The `validup` namespace is a **shared key-space** — it isn't owned solely by this package. ilingo's serial store walk falls through store-by-store *per key*, so an app co-owns the namespace by registering its own store **first**: it adds translations for custom extension `IssueCode`s and overrides individual built-in messages, while this catalog (appended) supplies the defaults for everything else.

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

The namespace name is exported as `NAMESPACE` if you'd rather build the catalog programmatically.

## Going Vue

For composables, the renderless `<IValidup>` / `<IValidupT>` components, and the plugin install hook, add [`@ilingo/validup-vue`](./validup-vue).
