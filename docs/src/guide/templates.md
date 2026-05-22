# Templates & Data

Translation strings can contain <code v-pre>{{var}}</code> placeholders. Pass values via `data`:

```typescript
await ilingo.get({
    group: 'app',
    key: 'age',
    data: { age: 18 },
});
// "I am 18 years old"
```

## Missing-data semantics

A <code v-pre>{{var}}</code> whose key is **not in `data`** is left untouched — the placeholder stays in the output. This is intentional: missing data is a developer-facing signal, not an error.

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

This means <code v-pre>{{count}}</code> works in plural forms without restating it. Explicitly setting `data.count` overrides the auto-merge.

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
