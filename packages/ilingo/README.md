# ilingo 💬

[![npm version](https://badge.fury.io/js/ilingo.svg)](https://badge.fury.io/js/ilingo)
[![codecov](https://codecov.io/gh/tada5hi/ilingo/branch/master/graph/badge.svg?token=4KNSG8L13V)](https://codecov.io/gh/tada5hi/ilingo)
[![Master Workflow](https://github.com/tada5hi/ilingo/actions/workflows/main.yml/badge.svg)](https://github.com/tada5hi/ilingo)
[![Known Vulnerabilities](https://snyk.io/test/github/Tada5hi/ilingo/badge.svg?targetFile=package.json)](https://snyk.io/test/github/Tada5hi/ilingo?targetFile=package.json)
[![semantic-release: angular](https://img.shields.io/badge/semantic--release-angular-e10079?logo=semantic-release)](https://github.com/semantic-release/semantic-release)

Ilingo is a lightweight library for translation and internationalization.

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
- [Store](#store)
  - [Memory](#memory-store)
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
            // group: app
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

To retrieve text from any of the language files, simply pass the filename/group and the access key
as the first parameter, separated by a period (.).

After that you can simply access the locale string, as described in the following:

```typescript
import { Ilingo } from 'ilingo';

const ilingo = new Ilingo({
    // ...
});

await ilingo.get({
    group: 'app',
    key: 'key'
});
// Hello my name is {{name}}

await ilingo.get({
    group: 'app',
    key: 'key',
    data: {
        name: 'Peter'
    }
});
// Hello my name is Peter

await ilingo.get({
    group: 'app',
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
    group: 'app',
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
    group: 'app',
    key: 'age',
    data: {
        age: 18
    }
});
// I am 18 yeas old

ilingo.setLocale('de');

await ilingo.get({
    group: 'app',
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
    group: 'app',
    key: 'age',
    data: {
        age: 18
    }
});
// I am 18 yeas old

await ilingo.get({
    group: 'app',
    key: 'age',
    data: {
        age: 18
    },
    locale: 'fr'
});
// J'ai 18 ans

await ilingo.get({
    group: 'app',
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
    group: 'foo',
    key: 'bar',
    data: {
        param: 'x'
    }
});
// baz x

await ilingo.get({
    group: 'foo',
    key: 'bar',
    data: {
        param: 'y'
    },
    locale: 'de'
});
// boz y
```

### Pluralization

Leaves may be CLDR plural objects keyed by category (`zero | one | two | few | many | other`); the matching form is selected via `Intl.PluralRules`. The `count` is automatically merged into `data` so `{{count}}` works without restating it.

```typescript
const ilingo = new Ilingo({
    store: new MemoryStore({
        data: {
            en: {
                cart: {
                    items: {
                        one: '{{count}} item',
                        other: '{{count}} items',
                    },
                },
            },
        },
    }),
});

await ilingo.get({ group: 'cart', key: 'items', count: 1 });
// "1 item"
await ilingo.get({ group: 'cart', key: 'items', count: 5 });
// "5 items"
```

If the selected category is absent from the leaf, `other` is used as a fallback.

**Recommended explicit form.** Prefer wrapping plural forms in `{ "@plural": { ... } }` to disambiguate them from regular namespaces that happen to use CLDR category names:

```typescript
{
    en: {
        cart: {
            items: {
                '@plural': {
                    one: '{{count}} item',
                    other: '{{count}} items',
                },
            },
        },
        form: {
            kind: {
                // Plain namespaces with CLDR-category-shaped keys are safe.
                other: { label: 'Other' },
            },
        },
    },
}
```

Structural detection (a bare `{ one, other }` object without the marker) is still supported for backward compatibility.

Plural leaves round-trip through `store.set()` — `StoreSetContext.value` accepts either a `string` or a `PluralLeaf`. The `FSStore.set` persistence writes them as JSON unchanged.

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

The chain is walked locale-first across all stores — the closest locale match wins regardless of store order. Within a single locale, every store is queried **in parallel** (`Promise.all`) and the first hit in declared insertion order is returned. For the in-memory and fs adapters this is essentially free; custom network-backed or side-effecting stores should expect every call within a locale even when an earlier store would have hit.

Inspect the resolution with:

```typescript
ilingo.getResolvedLocaleChain({ locale: 'pt-BR' });
// ['pt-BR', 'pt', 'en']

await ilingo.getResolvedLocale({ group: 'app', key: 'hi' });
// 'pt'   — which locale actually yielded a value
// undefined if no store had the key anywhere in the chain
```

### Missing-key handler

Override the default dev-mode `console.warn` via `onMissingKey`. Return a string to make it the result of `get()`; return `undefined` to keep the result `undefined`.

```typescript
const ilingo = new Ilingo({
    onMissingKey: ({ group, key, resolvedLocale }) => {
        track('i18n.miss', { group, key, locale: resolvedLocale });
        return `[missing: ${group}.${key}]`;
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

await ilingo.get({ group: 'app', key: 'owe',     data: { amount: 99 } });           // "You owe €99.00"
await ilingo.get({ group: 'app', key: 'signed',  data: { date: '2026-05-22T12:00:00Z' } }); // "Signed May 22, 2026"
await ilingo.get({ group: 'app', key: 'invited', data: { people: ['Alice', 'Bob', 'Carol'] } });
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

## Store

### Memory Store

The Memory Store is the default store and is set if no
other Store is specified manually.

### FS Store

The [FSStore](../fs/README.md) is a Store which access
the FileSystem for locating group files of different locales.


## License

Made with 💚

Published under [MIT License](./LICENSE).
