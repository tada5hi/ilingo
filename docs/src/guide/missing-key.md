# Missing-Key Handler

When the chain × stores walk exhausts without a hit, `Ilingo` invokes a **missing-key handler**. The handler decides what `get()` returns when a translation is missing.

## Default behaviour

If no handler is configured, `Ilingo` warns to the console **once per `(requestedLocale, group, key)` per instance** and returns `undefined`. The warning is silenced when `process.env.NODE_ENV === 'production'`.

The dedupe set is per-instance — multiple `Ilingo` instances don't dedupe each other's warnings.

## Custom handler

Override via `onMissingKey`:

```typescript
const ilingo = new Ilingo({
    onMissingKey: ({ group, key, locale, resolvedLocale }) => {
        track('i18n.miss', { group, key, locale, resolvedLocale });
        return `[missing: ${group}.${key}]`;
    },
});
```

Return a **string** to make it the result of `get()`; return **`undefined`** to keep the result `undefined`.

## Handler context

The handler receives a `MissingKeyContext`:

| Field | Type | Notes |
|---|---|---|
| `group` | `string` | The group that was requested |
| `key` | `string` | The dotted key path |
| `locale` | `string` | The *resolved* requested locale. Always set by the runtime, even though the source `GetContext.locale` is optional |
| `resolvedLocale` | `string \| undefined` | The chain terminator — the last locale that was tried. Optional in the type; populated whenever the chain was non-empty |
| `data` | `Data \| undefined` | Whatever `data` was passed to `get()` |
| `count` | `number \| undefined` | Whatever `count` was passed to `get()` |

If you need the full fallback chain inside the handler, call `ilingo.getResolvedLocaleChain({ locale })` from a closure — the chain isn't passed in because it's cheap to recompute and not always needed.

The handler is useful for:

- **Production telemetry** — log every miss to your error tracker.
- **Visible placeholders** in development — return `[missing: app.greeting]` so missed keys jump out in the UI.
- **Fallback to the key itself** — return `key` so the UI shows something readable rather than blanking out.

## Examples

### Show the key

```typescript
new Ilingo({
    onMissingKey: ({ group, key }) => `${group}.${key}`,
});
```

### Telemetry only

```typescript
new Ilingo({
    onMissingKey: ({ group, key, locale }) => {
        sentry.captureMessage('i18n.miss', { extra: { group, key, locale } });
        return undefined;
    },
});
```

### Locale-aware fallback string

```typescript
new Ilingo({
    onMissingKey: ({ key, locale }) =>
        locale === 'de' ? '[Übersetzung fehlt]' : '[missing translation]',
});
```
