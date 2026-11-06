# Error Handling

- Misses return `undefined`. They are never errors.
- `FSStore.loadNamespace` short-circuits the "already loaded" case (`isLoaded` guard) and shares one read between concurrent callers (`loading` map).
- File-loading errors from `locter`/`load` propagate. There is no project-wide error wrapper.
- `template()` does **not** error on a missing data key — the `{{var}}` stays in the output.
- Vue's `useTranslation` falls back to `"${namespace}.${key}"` when `Ilingo.get` returns `undefined` (the orchestrator's `onMissingKey` runs first and may substitute) — and uses the same fallback for its synchronous seed when `getSync` can't answer.

