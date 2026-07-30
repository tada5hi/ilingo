# Missing-Key Handler

When the chain × stores walk exhausts without a hit, `Ilingo` invokes a **missing-key handler**. The handler decides what `get()` returns when a translation is missing.

## Default behaviour

If no handler is configured, `Ilingo` warns to the console **once per `(requestedLocale, namespace, key)` per instance** and returns `undefined`. The warning is silenced when `process.env.NODE_ENV === 'production'`.

The dedupe set is per-instance — multiple `Ilingo` instances don't dedupe each other's warnings.

## Custom handler

Override via `onMissingKey`:

```typescript
const ilingo = new Ilingo({
    onMissingKey: ({ namespace, key, locale, resolvedLocale }) => {
        track('i18n.miss', { namespace, key, locale, resolvedLocale });
        return `[missing: ${namespace}.${key}]`;
    },
});
```

Return a **string** to make it the result of `get()`; return **`undefined`** to keep the result `undefined`.

## Handler context

The `onMissingKey` field is typed as `MissingKeyHandler = (ctx: MissingKeyContext) => string | undefined`. The handler receives a `MissingKeyContext`:

| Field | Type | Notes |
|---|---|---|
| `namespace` | `string` | The namespace that was requested |
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

## Called from both read paths

`onMissingKey` runs whenever a lookup exhausts the chain — on `get()` **and** on [`getSync()`](./stores#synchronous-reads-isyncstore). That is required by the equivalence guarantee: if the handler substitutes a string, the synchronous seed must produce the same string as the eventual async value, or the first render would differ from the second.

The consequence is that a consumer which seeds from `getSync()` (`@ilingo/vue` does, for every translated binding) reaches the handler **twice** for a genuinely missing key: once for the seed, once for the async pass. That is harmless for a pure handler that just returns a string, but a handler with side effects — reporting to Sentry, incrementing a counter, appending to a file — should dedupe on `(locale, namespace, key)` itself:

```typescript
const reported = new Set<string>();

const ilingo = new Ilingo({
    store,
    onMissingKey: (ctx) => {
        const id = `${ctx.locale}|${ctx.namespace}|${ctx.key}`;
        if (!reported.has(id)) {
            reported.add(id);
            telemetry.missingTranslation(ctx);
        }
        return undefined;
    },
});
```

The built-in default handler already does exactly this — its warn-once memo is shared by both paths, so a missing key warns once in total, not once per path.

## Examples

### Show the key

```typescript
new Ilingo({
    onMissingKey: ({ namespace, key }) => `${namespace}.${key}`,
});
```

### Telemetry only

```typescript
new Ilingo({
    onMissingKey: ({ namespace, key, locale }) => {
        sentry.captureMessage('i18n.miss', { extra: { namespace, key, locale } });
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
