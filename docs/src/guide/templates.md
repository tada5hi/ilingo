# Templates & Data

Translation strings can contain `{{var}}` placeholders. Pass values via `data`:

```typescript
await ilingo.get({
    group: 'app',
    key: 'age',
    data: { age: 18 },
});
// "I am 18 years old"
```

## Missing-data semantics

A `{{var}}` whose key is **not in `data`** is left untouched — the placeholder stays in the output. This is intentional: missing data is a developer-facing signal, not an error.

```typescript
const store = new MemoryStore({
    data: { en: { app: { hi: 'Hello, {{name}}!' } } },
});
const ilingo = new Ilingo({ store });

await ilingo.get({ group: 'app', key: 'hi' });
// "Hello, {{name}}!"
```

Catch these in development with the [missing-key handler](./missing-key) or with a linter.

## Count is auto-merged

When `count` is passed to `get()`, it is automatically copied into `data` if not already present:

```typescript
await ilingo.get({
    group: 'cart',
    key: 'items',
    count: 5,
});
// data is effectively { count: 5 }
```

This means `{{count}}` works in plural forms without restating it. Explicitly setting `data.count` overrides the auto-merge.

## Nested keys

Keys are dotted paths into the group's object:

```typescript
const store = new MemoryStore({
    data: {
        en: {
            settings: {
                profile: {
                    avatar: 'Change avatar',
                    nested: { deep: 'Deep value' },
                },
            },
        },
    },
});

await ilingo.get({ group: 'settings', key: 'profile.avatar' });
// "Change avatar"
await ilingo.get({ group: 'settings', key: 'profile.nested.deep' });
// "Deep value"
```

Path resolution is provided by [`pathtrace`](https://github.com/tada5hi/pathtrace) — same dot-notation semantics as `lodash.get`.

## Modifiers (formatters)

Placeholders also accept inline modifiers — see [Formatters](./formatters).

```typescript
'You owe {{amount, number(style=currency, currency=EUR)}}'
```

## Slot placeholders

Beyond `{{var}}` (double curly braces, substituted from `data`), messages can carry `{slot}` placeholders (single curly braces) that are filled by named scoped slots in renderer-aware components. The plain `template()` function leaves `{slot}` markers as literal text — only slot-aware renderers like `<ITranslateT>` consume them.

```typescript
'Hi {{user}}, please {cta} to continue.'
//   ^^^^^^         ^^^^^
//   data var       slot
```

Use cases: dropping a `<a>` tag, icon, or bold run into the middle of a translated sentence without splitting the message across keys.

See [Vue integration](../integrations/vue#itranslate-t-slot-aware-interpolation) for the consumer-side syntax.

## `tokenize()` — for renderers

For renderers that produce non-string output (VNodes, JSX, etc.), the core exposes a `tokenize(str): TemplateToken[]` helper that parses a message into `text` / `var` / `slot` tokens. This is what `<ITranslateT>` uses internally; the same primitive lets any future framework adapter walk the same AST.

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

`tokenize` and `template` are parallel parsers over the same syntax — `template` returns a substituted string for `Ilingo.format`'s common case; `tokenize` returns tokens for structured renderers.
