# Architecture

## Overview

ilingo follows a small **port-and-adapter** design:

- **Port**: `IStore` (`packages/ilingo/src/store/types.ts`) is the **read** contract — `id`, `get`, `getSync`, `getLocales` (ilingo reads a datasource; the orchestrator never writes). The read is required in *both* idioms, matching confinity's `IStore` and locter's `IReader`; an adapter that cannot read without I/O implements `getSync` by throwing `SyncUnavailableError` (`throwSyncUnavailable`). Writing is the opt-in `IMutableStore` (`set`); `MemoryStore` additionally exposes concrete `setSync` / `getLocalesSync` for in-memory seeding without `await` (those two are store-specific, not port members).
- **Adapters**: `MemoryStore` (default, in-memory; implements `IMutableStore`) and `FSStore` (lazy-loads files from disk, persists `set()` to JSON) implement the port.
- **Orchestrator**: `Ilingo` (`packages/ilingo/src/module.ts`, implementing the `IIlingo` interface) holds a `Map<symbol | string, IStore>` plus per-instance state for the locale, fallback chain, missing-key handler, plural-rules cache, and warn-once memo. On each `get()` it walks a resolved locale chain in order; within each locale it queries stores **serially in insertion order** and stops at the first hit.
- **Public contract**: `IIlingo` is the orchestrator's interface — every method on `Ilingo` plus the `stores` map and `formatters` registry. Neither `Ilingo` nor `IIlingo` is generic in the catalog (`class Ilingo implements IIlingo`); `get`/`getResolvedLocale` take a loose `GetContext` and return `Promise<string | undefined>`. Higher-layer packages (`@ilingo/vue`, `@ilingo/vuelidate`, `@ilingo/validup`, …) accept and return `IIlingo` in type positions so consumers can swap test doubles or decorating wrappers without depending on the concrete class. Construction still goes through the `Ilingo` class; runtime discrimination uses structural duck-typing (`'stores' in input`) so non-concrete `IIlingo` implementations are still recognised by `@ilingo/vue`'s `applyInstallInput`.

Higher-layer packages (`@ilingo/vue`, `@ilingo/vuelidate`) wrap the orchestrator for a specific framework — Vue's `provide`/`inject` makes the `IIlingo` instance and locale `Ref` available to descendants of the app root.

## Lookup and identity contracts

- Resolve the deduplicated locale chain before querying stores; the default locale is terminal. A closer locale wins independently of store registration order.
- Query stores serially in insertion order within each locale and stop at the first defined hit. Do not speculatively trigger later-store I/O.
- Register and merge by the store's string/symbol identity. Global-registry catalog IDs deduplicate across duplicate package copies; anonymous symbols remain distinct. A namespace can be shared by multiple stores, with per-key fallback.
- Keep higher-layer APIs typed against `IIlingo`. The concrete class owns construction, not every consumer contract.
- Translation addresses are `(locale, namespace, key, count?)`. Catalog descriptors normalize into locale/namespace maps; plural data is an explicit tagged node, not an arbitrary object with CLDR-named keys.

## Sync, errors and invalidation

- `getSync` must return the same answer as async lookup or throw `SyncUnavailableError` when synchronous availability is unknown. Reserve `undefined` for a definite miss; never skip an unavailable earlier store to seed from a later one.
- A loader's sync path must not start I/O. File stores can read supported modules synchronously and propagate real parse failures; async-only modules remain unavailable for synchronous seeding.
- Misses are not errors. Error families use `@ebec/core` marker-chain guards, including across duplicate package copies and serialized errors. Keep marker constants in a leaf module to avoid class/check import cycles.
- `onMissingKey` applies on both paths. Invalidation drops the selected cache scope before notifying subscribers; Vue subscriptions must dispose with their scope.

## Catalog and adapter boundaries

Formatters live in a per-instance registry. Descriptor builders share one normalizer, including validation adapters and file-loaded catalogs. Core code must remain browser-safe; filesystem and framework integrations stay in their packages. Watcher/load bookkeeping and in-flight deduplication must keep the sync availability signal truthful.

## Focused contracts

Read the relevant topic before changing that subsystem. These files are not imported by `CLAUDE.md`.

- [Lookup](topics/contracts-lookup.md)
- [Stores And Sync](topics/contracts-stores-and-sync.md)
- [Loaders](topics/contracts-loaders.md)
- [Catalogs And Formatters](topics/contracts-catalogs-and-formatters.md)

## Detailed topics

- [Design Patterns](topics/architecture-design-patterns.md)
- [Data Flow](topics/architecture-data-flow.md)
- [Error Handling](topics/architecture-error-handling.md)
- [File Structure (architectural layers)](topics/architecture-file-structure-architectural-layers.md)
- [Configuration](topics/architecture-configuration.md)
