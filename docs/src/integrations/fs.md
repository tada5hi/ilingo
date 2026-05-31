# File System

The `@ilingo/fs` package provides `FSStore` — an `IStore` adapter that lazy-loads translations from disk and persists `set()` calls back as JSON.

## Install

```bash
npm install @ilingo/fs
```

## Usage

```typescript
import { Ilingo } from 'ilingo';
import { FSStore } from '@ilingo/fs';

const ilingo = new Ilingo({
    store: new FSStore({ directory: './language' }),
});
```

Locale strings live in subdirectories — one per locale — with one file per namespace:

```bash
└── language
    ├── de
    │   ├── app.json
    │   └── forum.json
    └── en
        ├── app.json
        └── forum.json
```

## Supported file extensions

`FSStore` resolves `<directory>/<locale>/<namespace>.<ext>` across the following extensions, in order:

`.ts`, `.mts`, `.js`, `.mjs`, `.cjs`, `.json`, `.conf`

Loading is provided by [`locter`](https://github.com/Tada5hi/locter) — first match wins.

## File formats

### JSON

```json
{
    "greeting": "Hello, {{name}}!",
    "nested": {
        "deep": "Deep value"
    },
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

### TypeScript / JavaScript (ESM)

```typescript
export default {
    greeting: 'Hello, {{name}}!',
};
```

### CommonJS

```javascript
module.exports = {
    greeting: 'Hello, {{name}}!',
};
```

## Multiple directories

Pass an array to layer translations. Later directories merge into earlier ones via `smob`:

```typescript
const store = new FSStore({
    directory: ['./language', './overrides'],
});
```

For each `(locale, namespace)`, files from both directories are loaded and merged. Later directories win on conflicts.

## Persistence

`FSStore.set(...)` writes the updated namespace back to disk as JSON:

```typescript
await store.set({
    locale: 'en',
    namespace: 'app',
    key: 'greeting',
    value: 'Hello, {{name}}!',
});
// → ./language/en/app.json
```

By default writes go to the **first configured directory**. Pass `writeDirectory` to split read and write paths:

```typescript
const store = new FSStore({
    directory: ['./language', './overrides'],
    writeDirectory: './overrides',
});
```

Writes are **atomic** — `FSStore` writes to a temporary file in the same directory then `rename`s it over the target. The full merged record is serialised; sibling keys are preserved.

If the original source for a namespace was a `.ts`/`.js`/`.cjs` file, that file is left untouched. The new `.json` lives alongside it. On the next load, `smob` merges both — the newer JSON wins.

## Watch mode (dev hot-reload)

`FSStore({ watch: true })` keeps the cache in sync with the filesystem via [chokidar](https://github.com/paulmillr/chokidar). Each file change under the configured `directory` paths invalidates the matching `(locale, namespace)` cache entry and emits an `invalidate` event:

```typescript
import { FSStore } from '@ilingo/fs';

const store = new FSStore({
    directory: './language',
    watch: process.env.NODE_ENV !== 'production',
});

store.on('invalidate', (locale, namespace) => {
    console.log(`[i18n] reloaded ${locale}/${namespace}`);
});
```

`@ilingo/vue`'s `useTranslation` subscribes to these events automatically — editing a translation file refreshes the rendered component without a remount.

### Optional peer dependency

`chokidar` is **not** a hard dependency of `@ilingo/fs`. Install it explicitly when enabling `watch: true`:

```bash
npm i -D chokidar
```

If chokidar isn't installed and `watch: true` is set, the store logs a clear error and continues without watching (so production builds aren't broken by a missing dev dep).

### Manual invalidation

Even without watch mode, you can drop cache entries manually — useful when an external process (CMS, deploy script) updates a translation file:

```typescript
store.invalidate('en', 'app');   // drop one (locale, namespace)
store.invalidate('en');          // drop all namespaces for en
store.invalidate();              // drop everything
```

### Cleanup

Call `store.close()` on app shutdown and in tests to stop the watcher and detach listeners. Idempotent.

## When to use

- Translation files are part of the codebase and edited by humans (translators, contributors).
- You want hot-reloading: `FSStore` lazy-loads per namespace on first access, so dev-server restarts are not needed. Pair with `watch: true` for instant in-process refresh.
- You need durable runtime edits (CMS-like flows): the persistence story round-trips cleanly.

For network-loaded translations, see [`LoaderStore`](/guide/stores#loaderstore) or write a custom store — see [Guide → Stores → Writing a custom store](/guide/stores).
