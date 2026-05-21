# Phase 4 — Type-safe key inference

**Status**: Blocked by Phase 2 (plural-shaped leaves change the catalog type).
**Tracks**: [#898](https://github.com/tada5hi/ilingo/issues/898).

Infer the legal `(group, key)` pairs from a typed catalog so the compiler catches typos and renames.

## Scope

- Make `Ilingo` generic in the catalog shape: `class Ilingo<Catalog extends LocalesRecord = LocalesRecord>`.
- Derive `Group<Catalog>` and `Key<Catalog, G>` from the catalog. `key` accepts the `pathtrace`-style dotted path; the type should narrow nested objects to their leaf string literals (and the plural-shape leaves after Phase 2).
- Add a `defineCatalog<T>(c: T): T` helper so consumers can ergonomically declare the catalog as a const-typed value without losing inference.
- Backward compat: `new Ilingo()` with no generic stays as today — `LocalesRecord` permits any string key.
- Document the pattern in `packages/ilingo/README.md` with a copy-pastable example.

## Files touched

- `packages/ilingo/src/types.ts` — derived helper types.
- `packages/ilingo/src/module.ts` — generic signatures on `get`, `getResolvedLocale`, etc.
- `packages/ilingo/src/store/types.ts` — `IStore` becomes generic too, but defaults preserve the runtime shape.
- `packages/vue/src/composables/use-translation.ts` — propagate the generic through the composable so `useTranslation<MyCatalog>({...})` narrows.
- `packages/ilingo/test/unit/types.spec-d.ts` (**new**) — `vitest` type tests via `expectTypeOf`.

## Acceptance

- [ ] `ilingo.get({ group: 'app', key: 'unknown' })` errors at compile time when typed with a concrete catalog.
- [ ] Plural-shaped leaves accept `{ count: number }` and require it (so `ilingo.get({ group, key })` errors when the leaf is plural-only).
- [ ] No runtime change — existing `.spec.ts` cases still pass unchanged.

## Why now

Orthogonal to the formatter work, so Phases 3 and 4 can land in either order. Sequencing it after #895 means the plural-leaf type is final before we encode it into the inferred keys.
