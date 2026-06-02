# Changelog

## [1.0.0](https://github.com/tada5hi/ilingo/compare/validup-vue-v0.1.0...validup-vue-v1.0.0) (2026-06-02)


### ⚠ BREAKING CHANGES

* the `Config` and `ConfigInput` exports are removed. Use `IlingoOptions` instead (e.g. import { IlingoOptions } from 'ilingo').
* MemoryStore({ data }) now requires a descriptor tree (defineCatalog([...])) rather than a plain { locale: { namespace: lines } } object; the @plural marker is replaced by definePlural() / a { type: 'plural', data } node; FSStore files and LoaderStore loaders return a lines node ({ type: 'lines', data }); Ilingo and IIlingo are no longer generic and get() keys are loose strings; @ilingo/validup no longer exports ValidupCatalog / ValidupCatalogEntries.
* `Ilingo.stores` is now a `Map<symbol|string, IStore>` (was `Set<IStore>`); `Ilingo.register(store)` is renamed to `registerStore(store)` and dedupes by `store.id`; `IStore` now requires a `readonly id`. `@ilingo/validup`'s `Store` / `createStore` / translations moved to the `@ilingo/validup/store/memory` subpath (`createStore` → `createMemoryStore`); the `register(ilingo)` helper was removed in favour of `ilingo.registerStore(createMemoryStore())`.

### Features

* descriptor-tree catalogs and remove type-safe key inference ([#959](https://github.com/tada5hi/ilingo/issues/959)) ([f61ee8c](https://github.com/tada5hi/ilingo/commit/f61ee8c00fc093e6efaee425736a97c1bdc48a5a))
* validup bridge — new @ilingo/validup(-vue) packages + breaking catalog/store API ([#939](https://github.com/tada5hi/ilingo/issues/939)) ([f19f03f](https://github.com/tada5hi/ilingo/commit/f19f03f48f17e739f2b6ed533d4f8ddef59f92e0))
* validup group/feedback composables, composable-mode &lt;IValidup&gt;, and &lt;IValidupT&gt; ([#956](https://github.com/tada5hi/ilingo/issues/956)) ([9cb1b8c](https://github.com/tada5hi/ilingo/commit/9cb1b8c52c5b762f4a40a38955e4caa3cb1684c6))
* **validup-vue:** rename FieldFeedback to FieldValidation ([#962](https://github.com/tada5hi/ilingo/issues/962)) ([b130fd9](https://github.com/tada5hi/ilingo/commit/b130fd9fd711a586edcdef983f93accf4962fb25)), closes [#961](https://github.com/tada5hi/ilingo/issues/961)


### Bug Fixes

* **deps:** drop stale vue override and declare validup-vue test deps ([1960941](https://github.com/tada5hi/ilingo/commit/1960941708eb46e4e19d10a8824673ba3a91dcf5))


### Code Refactoring

* remove dead code and realign docs after descriptor-tree migration ([#960](https://github.com/tada5hi/ilingo/issues/960)) ([0d1e798](https://github.com/tada5hi/ilingo/commit/0d1e7985b224812e33214699fdcdfa88bf579cef))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @ilingo/validup bumped from ^0.1.0 to ^1.0.0
    * @ilingo/vue bumped from ^5.0.0 to ^6.0.0
    * ilingo bumped from ^5.0.0 to ^6.0.0
  * peerDependencies
    * @ilingo/validup bumped from ^0.1.0 to ^1.0.0
    * @ilingo/vue bumped from ^5.0.0 to ^6.0.0
    * ilingo bumped from ^5.0.0 to ^6.0.0
