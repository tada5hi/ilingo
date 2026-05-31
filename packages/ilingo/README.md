# ilingo 💬

[![npm version](https://badge.fury.io/js/ilingo.svg)](https://badge.fury.io/js/ilingo)
[![codecov](https://codecov.io/gh/tada5hi/ilingo/branch/master/graph/badge.svg?token=4KNSG8L13V)](https://codecov.io/gh/tada5hi/ilingo)
[![Master Workflow](https://github.com/tada5hi/ilingo/actions/workflows/main.yml/badge.svg)](https://github.com/tada5hi/ilingo)
[![Known Vulnerabilities](https://snyk.io/test/github/Tada5hi/ilingo/badge.svg?targetFile=package.json)](https://snyk.io/test/github/Tada5hi/ilingo?targetFile=package.json)
[![semantic-release: angular](https://img.shields.io/badge/semantic--release-angular-e10079?logo=semantic-release)](https://github.com/semantic-release/semantic-release)

Ilingo is a lightweight library for translation and internationalization. The core's only runtime dependencies are [`pathtrace`](https://www.npmjs.com/package/pathtrace) and [`smob`](https://www.npmjs.com/package/smob); on common workloads it runs **1.6× – 2.3× faster than `i18next`** ([benchmarks](https://ilingo.tada5hi.net/performance)).

**Table of Contents**

- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
  - [Basic](#basic)
  - [Singleton](#singleton)
  - [Parameters](#parameters)
  - [Locales](#locales)
  - [Lazy](#lazy)
  - [Pluralization](#pluralization)
  - [Fallback locale chain](#fallback-locale-chain)
  - [Missing-key handler](#missing-key-handler)
  - [Formatters](#formatters)
  - [Type-safe keys](#type-safe-keys)
  - [The `IIlingo` interface](#the-iilingo-interface)
  - [Slot placeholders & `tokenize()`](#slot-placeholders--tokenize)
  - [Custom formatters](#custom-formatters)
  - [Locale negotiation](#locale-negotiation)
- [Store](#store)
  - [Memory](#memory-store)
  - [Loader](#loader-store)
  - [Invalidation](#invalidation)
  - [FileSystem](#fs-store)
- [License](#license)

## Installation

```bash
npm install ilingo --save
```

## Configuration
While full localization of an application is a complex subject,
swapping out strings in your application for different supported languages/locales is simple.
The different locale strings for translation are provided  by interacting with the library class instance.

## Usage

### Basic

Create an instance and set the default locale.

```typescript
import { Ilingo } from 'ilingo';

const ilingo = new Ilingo({
    locale: 'en'
})
```

The **default** (memory-) store can be initialized with some default data.
```typescript
import { Ilingo } from 'ilingo';

const store = new MemoryStore({
    data: {
        // locale: de
        de: {
            // namespace: app
            app: {
                key: 'Hallo mein Name ist {{name}}'
            }
        },
        // locale: en
        en: {
            app: {
                key: 'Hello my name is {{name}}'
            }
        },
    }
});

const ilingo = new Ilingo({
    store,
    locale: 'en'
});
```

To retrieve text from any of the language files, simply pass the filename/namespace and the access key
as the first parameter, separated by a period (.).

After that you can simply access the locale string, as described in the following:

```typescript
import { Ilingo } from 'ilingo';

const ilingo = new Ilingo({
    // ...
});

await ilingo.get({
    namespace: 'app',
    key: 'key'
});
// Hello my name is {{name}}

await ilingo.get({
    namespace: 'app',
    key: 'key',
    data: {
        name: 'Peter'
    }
});
// Hello my name is Peter

await ilingo.get({
    namespace: 'app',
    key: 'key',
    data: {
        name: 'Peter'
    },
    locale: 'de'
});
// Hallo mein Name ist Peter
```

### Parameters
As a template delimiter a mustache like `{{}}` interpolation is used.
Data properties can be injected as a second argument, e.g.

```typescript
import { Ilingo, MemoryStore } from 'ilingo';

const ilingo = new Ilingo({
    store: new MemoryStore({
        data: {
            en: {
                app: {
                    age: 'I am {{age}} years old.'
                }
            }
        }
    })
});

await ilingo.get({
    namespace: 'app',
    key: 'age',
    data: {
        age: 18
    }
});
// I am 18 yeas old
```

### Locales

The default locale, which is used by the singleton instance, can be modified after initialization:

```typescript
import { Ilingo } from 'ilingo';

const ilingo = new Ilingo({
    // ...
});

await ilingo.get({
    namespace: 'app',
    key: 'age',
    data: {
        age: 18
    }
});
// I am 18 yeas old

ilingo.setLocale('de');

await ilingo.get({
    namespace: 'app',
    key: 'age',
    data: {
        age: 18
    }
});
// Ich bin 18 Jahre alt
```

It also can be **temporarily** overwritten, by passing the locale as the third argument
to one of the helper or supported singleton methods:

```typescript
import { Ilingo } from 'ilingo';

const ilingo = new Ilingo({
    // ...
});

await ilingo.get({
    namespace: 'app',
    key: 'age',
    data: {
        age: 18
    }
});
// I am 18 yeas old

await ilingo.get({
    namespace: 'app',
    key: 'age',
    data: {
        age: 18
    },
    locale: 'fr'
});
// J'ai 18 ans

await ilingo.get({
    namespace: 'app',
    key: 'age',
    data: {
        age: 18
    },
    locale: 'de'
});
// Ich bin 18 Jahre alt
```

### Lazy

Another option is to add translations on the fly and access them afterwards.

```typescript
import { Ilingo, MemoryStore } from 'ilingo';

const ilingo = new Ilingo({
    store: new MemoryStore({
        data: {
            en: {
                foo: {
                    bar: 'baz {{param}}'
                }
            },
            de: {
                foo: {
                    bar: 'boz {{param}}'
                }
            }
        }
    })
});

await ilingo.get({
    namespace: 'foo',
    key: 'bar',
    data: {
        param: 'x'
    }
});
// baz x

await ilingo.get({
    namespace: 'foo',
    key: 'bar',
    data: {
        param: 'y'
    },
    locale: 'de'
});
// boz y
```

### Pluralization

Plural leaves are CLDR objects keyed by category (`zero | one | two | few | many | other`); the matching form is selected via `Intl.PluralRules`. The `count` is automatically merged into `data` so `{{count}}` works without restating it.

Wrap plural forms in `{ "@plural": { ... } }` — the marker disambiguates them from regular namespaces that happen to use CLDR-category key names. A bare `{ one, other }` object without the wrapper is treated as a plain nested namespace.

**JSON files** (loaded by `FSStore`) — use the literal `@plural` key:

```json
{
    "cart": {
        "items": {
            "@plural": {
                "one": "{{count}} item",
                "other": "{{count}} items"
            }
        }
    }
}
```

**TS / JS files** (inline `defineCatalog`, or loaded by `FSStore`) — use the `definePlural` helper:

```typescript
import { Ilingo, MemoryStore, defineCatalog, definePlural } from 'ilingo';

const catalog = defineCatalog({
    en: {
        cart: {
            items: definePlural({
                one: '{{count}} item',
                other: '{{count}} items',
            }),
        },
        form: {
            kind: {
                // Plain namespaces with CLDR-category-shaped keys are safe —
                // without the `@plural` wrapper they are walked normally.
                other: { label: 'Other' },
            },
        },
    },
});

const ilingo = new Ilingo<typeof catalog>({
    store: new MemoryStore({ data: catalog }),
});

await ilingo.get({ namespace: 'cart', key: 'items', count: 1 });  // "1 item"
await ilingo.get({ namespace: 'cart', key: 'items', count: 5 });  // "5 items"
```

`definePlural` is a thin identity helper — it returns `{ '@plural': leaf }` with the same runtime shape as the JSON form. The `const` generic preserves the literal types of each plural form (so `Ilingo<typeof catalog>` still sees them as plural keys requiring `count`). The TS/JS version gets CLDR-category autocomplete and a compile error if you misspell `other` or pass a non-CLDR key.

If the selected category is absent from the leaf, `other` is used as a fallback.

Plural leaves round-trip through `store.set()` — `StoreSetContext.value` accepts either a `string` or a `PluralLeaf` (the `{ "@plural": ... }` wrapper). The `FSStore.set` persistence writes them as JSON unchanged.

### Fallback locale chain

`get()` walks an ordered fallback chain. By default the chain is derived from BCP-47 parents of the requested locale, terminating at `en`:

```typescript
new Ilingo({ locale: 'pt-BR' }).getResolvedLocaleChain({ locale: 'pt-BR' });
// ['pt-BR', 'pt', 'en']
```

Override with `fallback`:

```typescript
new Ilingo({ fallback: 'es' });            // string
new Ilingo({ fallback: ['es', 'fr'] });    // array, in order
new Ilingo({                               // function: per-call
    fallback: (locale) => locale.startsWith('pt') ? ['es'] : [],
});
new Ilingo({ fallback: false });           // disable fallback entirely
new Ilingo({ fallback: [] });              // equivalent to `false`
```

The chain is walked locale-first across all stores — the closest locale match wins regardless of store order. Within a single locale, stores are queried **serially in insertion order**, stopping at the first hit. A network-backed adapter registered after a Memory adapter is never called when the Memory adapter answers — the orchestrator does not pre-fan-out across stores.

Inspect the resolution with:

```typescript
ilingo.getResolvedLocaleChain({ locale: 'pt-BR' });
// ['pt-BR', 'pt', 'en']

await ilingo.getResolvedLocale({ namespace: 'app', key: 'hi' });
// 'pt'   — which locale actually yielded a value
// undefined if no store had the key anywhere in the chain
```

### Missing-key handler

Override the default dev-mode `console.warn` via `onMissingKey`. Return a string to make it the result of `get()`; return `undefined` to keep the result `undefined`.

```typescript
const ilingo = new Ilingo({
    onMissingKey: ({ namespace, key, resolvedLocale }) => {
        track('i18n.miss', { namespace, key, locale: resolvedLocale });
        return `[missing: ${namespace}.${key}]`;
    },
});
```

### Formatters

Template placeholders support modifiers backed by `Intl.NumberFormat`, `Intl.DateTimeFormat`, and `Intl.ListFormat`:

```typescript
const ilingo = new Ilingo({
    store: new MemoryStore({
        data: {
            en: {
                app: {
                    owe: 'You owe {{amount, number(style=currency, currency=EUR)}}',
                    signed: 'Signed {{date, date(dateStyle=medium, timeZone=UTC)}}',
                    invited: '{{people, list(style=long, type=conjunction)}}',
                },
            },
        },
    }),
});

await ilingo.get({ namespace: 'app', key: 'owe',     data: { amount: 99 } });           // "You owe €99.00"
await ilingo.get({ namespace: 'app', key: 'signed',  data: { date: '2026-05-22T12:00:00Z' } }); // "Signed May 22, 2026"
await ilingo.get({ namespace: 'app', key: 'invited', data: { people: ['Alice', 'Bob', 'Carol'] } });
// → "Alice, Bob, and Carol"
```

Syntax:

```text
{{value}}                          plain substitution
{{value, formatter}}               formatter with no options
{{value, formatter(k=v, k2=v2)}}   formatter with options
```

The locale used to construct the `Intl.*Format` instance is the **resolved** locale — the one that actually yielded the message via the fallback chain — not the requested one. `Intl.*Format` instances are memoised per `(formatter, locale, options)` on the `Ilingo` instance, so repeated renders do not reallocate.

Option-value coercion: `42` → `42` (number), `true` / `false` → boolean, anything else → string. So `currency=EUR` becomes `{ currency: 'EUR' }`, `minimumFractionDigits=2` becomes `{ minimumFractionDigits: 2 }`.

Unknown modifiers fall back to `String(value)` and emit a one-shot dev-mode warning (silenced in `process.env.NODE_ENV === 'production'`). Malformed modifier expressions (unbalanced parens, non-identifier names) are treated the same way — never throw.

### Type-safe keys

`Ilingo` is generic in the catalog shape. Wrap your catalog with `defineCatalog` to capture its narrowest literal types, pass it as the type parameter to `Ilingo`, and the compiler refuses typos, unknown namespaces, and plural-key calls that forget `count`.

```typescript
import { Ilingo, MemoryStore, defineCatalog } from 'ilingo';

const catalog = defineCatalog({
    en: {
        app: {
            greeting: 'Hi {{name}}',
            nested: { deep: { leaf: 'Deep value' } },
        },
        cart: {
            items: {
                '@plural': {
                    one: '{{count}} item',
                    other: '{{count}} items',
                },
            },
        },
    },
    de: { /* …same shape… */ },
});

const ilingo = new Ilingo<typeof catalog>({
    store: new MemoryStore({ data: catalog }),
});

await ilingo.get({ namespace: 'app', key: 'greeting' });           // OK
await ilingo.get({ namespace: 'app', key: 'nested.deep.leaf' });   // OK — dotted paths inferred
await ilingo.get({ namespace: 'app', key: 'unknown' });            // ❌ type error
await ilingo.get({ namespace: 'unknown', key: 'greeting' });       // ❌ type error
await ilingo.get({ namespace: 'cart',  key: 'items' });            // ❌ type error — count is required
await ilingo.get({ namespace: 'cart',  key: 'items', count: 1 });  // OK
```

`defineCatalog<const T>(catalog)` uses TS 5+ const-generic inference so per-key literals (and `@plural`-wrapped plural leaves) aren't widened to `string`. The runtime function is a no-op identity — purely a type carrier.

For one-file-per-locale layouts, reach for `defineLocale<const T extends Namespaces>(locale: T): T` — the per-locale companion. It preserves literal types through an `export default` boundary and validates that the body is a `Namespaces` (catching a stray top-level string that `as const` would let through). Combine with `defineCatalog` to merge per-locale files into a single typed catalog:

```typescript
// locales/en.ts
import { defineLocale, definePlural } from 'ilingo';

export default defineLocale({
    app:  { greeting: 'Hi {{name}}' },
    cart: { items: definePlural({ one: '1 item', other: '{{count}} items' }) },
});

// locales/index.ts
import { defineCatalog } from 'ilingo';
import en from './en';
import de from './de';
export const catalog = defineCatalog({ en, de });
```

For **one-file-per-namespace** layouts, `defineNamespace<const T extends Lines>(namespace: T): T` is the per-namespace companion — same const-capture + shape validation (against `Lines`), for when each namespace lives in its own file:

```typescript
// locales/en/app.ts
import { defineNamespace, definePlural } from 'ilingo';

export default defineNamespace({
    greeting: 'Hi {{name}}',
    items: definePlural({ one: '1 item', other: '{{count}} items' }),
});
```

`Lines` is recursive, so a namespace can nest arbitrarily (`{ nav: { home: 'Home' } }`) and you address it with a dotted key (`key: 'nav.home'`).

Inference is structural, derived from the union of locales. Keep all locales aligned to the same shape and the inferred `Key<C, G>` is the natural set of leaf paths. Diverging locales widen the union but never break compilation.

`new Ilingo()` (no generic) preserves today's loose typing — `namespace: string, key: string` are accepted. The generic is opt-in.

### The `IIlingo` interface

`IIlingo<C>` is the public type contract of the orchestrator — every method on the concrete `Ilingo` class plus the `stores` map and `formatters` registry. Library code that accepts an orchestrator (`@ilingo/vue`, `@ilingo/vuelidate`, `@ilingo/validup`, …) accepts and returns `IIlingo`, so consumers can swap in test doubles or decorating wrappers without depending on the concrete class.

```typescript
import type { IIlingo } from 'ilingo';

function register(ilingo: IIlingo) {
    ilingo.register(myStore, Symbol.for('@scope/pkg'));
}
```

`new Ilingo()` is still the way to construct an instance. Prefer `IIlingo` as the type position; reserve `Ilingo` (the class) for construction and `instanceof` checks.

### Slot placeholders & `tokenize()`

In addition to `{{var}}` data placeholders (and modifier syntax), messages can carry `{slot}` markers (single curly braces) for renderers that produce structured output rather than a string. The core `tokenize(str)` helper parses a message into `text` / `var` / `slot` tokens:

```typescript
import { tokenize } from 'ilingo';

tokenize('Hi {{user}}, please {cta} now.');
// [
//   { kind: 'text', value: 'Hi ' },
//   { kind: 'var', name: 'user' },
//   { kind: 'text', value: ', please ' },
//   { kind: 'slot', name: 'cta' },
//   { kind: 'text', value: ' now.' },
// ]
```

`tokenize()` and `template()` are parallel parsers — `template()` returns a substituted string (used by `Ilingo.format`); `tokenize()` returns tokens for VNode-producing renderers (e.g. `@ilingo/vue`'s `<ITranslateT>`). Plain `Ilingo.get()` always returns a string, so `{slot}` markers survive into the output unless a slot-aware renderer consumes them.

### Custom formatters

Register your own modifier names alongside the built-in `number` / `date` / `list`:

```typescript
const ilingo = new Ilingo({
    store: /* ... */,
    formatters: {
        upper: (value, _opts, locale) => String(value).toLocaleUpperCase(locale),
        relative: (value, _opts, locale) => {
            const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
            return rtf.format(Number(value), 'day');
        },
    },
});

await ilingo.get({
    namespace: 'app', key: 'shout',
    data: { name: 'peter' },
});
// "{{name, upper}}" → "PETER"
```

Or call `ilingo.registerFormatter(name, fn)` after construction. Custom formatters receive `(value, options, locale)` — `options` is the parsed `{key=value, ...}` from inside the modifier parens.

`Config.formatters` overrides win against the built-ins by name, so you can swap the default `number` formatter for a custom one if needed.

### Locale negotiation

`negotiateLocale(supported, requested)` picks the best match between a list of supported locales and a list of requested ones (typically from an HTTP `Accept-Language` header). Implements BCP-47 best-match: exact match → prefix match → parent walk.

```typescript
import { Ilingo, MemoryStore, negotiateLocale, parseAcceptLanguage } from 'ilingo';

const ilingo = new Ilingo({
    store: new MemoryStore({ data: /* ... */ }),
});

const supported = ['en', 'de', 'pt-BR'];

negotiateLocale(supported, ['pt-PT', 'pt', 'en']);
// → 'pt-BR'  (requested 'pt' matches supported 'pt-BR' as a parent prefix)

const fromHeader = parseAcceptLanguage('en-US,en;q=0.9,de;q=0.8');
// → ['en-US', 'en', 'de']

const chosen = negotiateLocale(supported, fromHeader) ?? 'en';
ilingo.setLocale(chosen);
```

`parseAcceptLanguage(header)` parses the RFC 9110 header into a quality-sorted tag list. Both functions are pure utilities — they don't mutate `Ilingo` state. Compose them with `setLocale()` to wire request-side locale negotiation in a server (Express / Hono / etc.) or client (`navigator.languages`).

## Store

A store implements the read `IStore` port — `id`, `get`, `getLocales`. ilingo is **read-first**: the orchestrator only ever *reads* (it never calls `set`), so that's the whole required contract, and it is **frozen** for the stable release. **Writing** is an opt-in capability — `IMutableStore` adds `set(ctx)` and is implemented by `MemoryStore` (in-memory) and `FSStore` (disk); `extendStore(...)` takes a `IMutableStore`, and `isMutableStore(store)` is the runtime guard. Other capabilities (cache invalidation, file watching, …) layer the same way (see [Invalidation](#invalidation) below). `has`, `delete`, `getKeys`, and batch `getAll` were each considered and deferred — see the JSDoc on `IStore` in `packages/ilingo/src/store/types.ts` for the per-method rationale.

### Registering stores — `register(store, id?)`

`Ilingo` holds its stores in a `public readonly stores: Map<symbol, IStore>`, keyed by a `symbol` identity, queried serially in insertion order (first hit wins). Add stores with `register`:

```typescript
const ilingo = new Ilingo({ store: appStore });        // constructor seeds the first store
const key = ilingo.register(overrideStore);            // anonymous Symbol() → always added; returns the key
ilingo.register(libraryStore, Symbol.for('@me/lib'));  // keyed → idempotent (no-op if that key exists)
```

- **Without `id`** — mints a fresh `Symbol()`, so the store is always added; the returned symbol lets you dedupe or replace later.
- **With `id`** — idempotent: a no-op (keeping the existing store) if a store is already registered under that key. Library adapters pass a `Symbol.for('@scope/pkg')` so re-registration — even from a duplicate package copy — never stacks duplicates. This is how `@ilingo/validup` and `@ilingo/vuelidate` register their catalogs (each exports a `register(ilingo)` helper + `STORE_ID`).

Because a `namespace` is a **shared key-space** (the walk falls through store-by-store per *missing key*), registering an app store before a library's catalog lets the app add or override individual keys of that namespace while the library supplies the defaults. `Ilingo` implements the `IIlingo` interface — type against `IIlingo` when you want to accept any orchestrator implementation.

### Memory Store

The Memory Store is the default store and is set if no
other Store is specified manually.

### Loader Store

For browser / SPA apps with code-split locale chunks, `LoaderStore` lazy-loads translation data via a user-supplied function and caches the result per `(locale, namespace)`:

```typescript
import { Ilingo, LoaderStore } from 'ilingo';

const ilingo = new Ilingo({
    store: new LoaderStore({
        loader: async (locale, namespace) => {
            const m = await import(`./locales/${locale}/${namespace}.json`);
            return m.default;
        },
        locales: ['en', 'de', 'fr'],   // optional — answers `getLocales()`
    }),
});

await ilingo.get({ namespace: 'cart', key: 'items', count: 3 });
// First call loads `./locales/en/cart.json`; subsequent calls hit the cache.
```

Concurrent `get()`s for the same `(locale, namespace)` share one loader invocation. Misses (loader returning `undefined`) are cached too, so the loader isn't re-called for keys it has no answer for.

### Invalidation

Stores that cache lookups can implement `IInvalidatingStore`:

```typescript
export interface IInvalidatingStore extends IStore {
    invalidate(locale?: string, namespace?: string): void;
    on(event: 'invalidate', listener: (locale?: string, namespace?: string) => void): () => void;
}
```

Drop scoped cache entries with `invalidate(locale?, namespace?)` — `()` drops everything, `('en')` drops all namespaces for `en`, `('en', 'app')` drops just one namespace. Subscribe to invalidation events via `on('invalidate', cb)` to react to file changes or manual drops.

Both `LoaderStore` and `FSStore` implement this interface. The Vue composable (`@ilingo/vue`) subscribes automatically — file changes under `FSStore({ watch: true })` trigger a re-render without a remount.

Detect via the `isInvalidatingStore(store)` type guard before subscribing.

### FS Store

The [FSStore](../fs/README.md) is a Store which access
the FileSystem for locating namespace files of different locales.


## License

Made with 💚

Published under [MIT License](./LICENSE).
