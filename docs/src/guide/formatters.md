# Formatters

Template placeholders accept inline modifiers powered by `Intl.NumberFormat`, `Intl.DateTimeFormat`, and `Intl.ListFormat`.

## Syntax

```text
{{value}}                          plain substitution
{{value, formatter}}               formatter with no options
{{value, formatter(k=v, k2=v2)}}   formatter with options
```

## Built-in formatters

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

await ilingo.get({ group: 'app', key: 'owe', data: { amount: 99 } });
// "You owe €99.00"

await ilingo.get({ group: 'app', key: 'signed', data: { date: '2026-05-22T12:00:00Z' } });
// "Signed May 22, 2026"

await ilingo.get({ group: 'app', key: 'invited', data: { people: ['Alice', 'Bob', 'Carol'] } });
// "Alice, Bob, and Carol"
```

| Formatter | Backed by                | Common options                                              |
|-----------|--------------------------|-------------------------------------------------------------|
| `number`  | `Intl.NumberFormat`      | `style`, `currency`, `minimumFractionDigits`, `notation`    |
| `date`    | `Intl.DateTimeFormat`    | `dateStyle`, `timeStyle`, `timeZone`, `hour12`              |
| `list`    | `Intl.ListFormat`        | `style`, `type`                                             |

## Option-value coercion

Options are parsed from the source string. The coercion rules:

| Source         | Result            |
|----------------|-------------------|
| `42`           | `42` (number)     |
| `true` / `false` | boolean         |
| anything else  | string            |

So `currency=EUR` becomes `{ currency: 'EUR' }`, `minimumFractionDigits=2` becomes `{ minimumFractionDigits: 2 }`.

## Which locale does the formatter use?

The **resolved** locale — the one that actually yielded the message via the fallback chain — not the requested one.

This matters when `en-US` falls back to `en`: the formatter uses `en`, matching the strings you wrote, not the user's request.

## Caching

`Intl.*Format` instances are memoised per `(formatter, locale, JSON-encoded options)` on the `Ilingo` instance. Repeated renders do not reallocate.

## Unknown modifiers

Unknown formatter names fall back to `String(value)` and emit a **one-shot dev-mode warning** (silenced in `process.env.NODE_ENV === 'production'`). Malformed modifier expressions (unbalanced parens, non-identifier names) are treated the same way — formatters never throw.

The warning is deduplicated **per `Ilingo` instance** — different instances log independently.
