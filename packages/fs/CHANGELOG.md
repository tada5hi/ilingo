# Changelog

## [6.0.0](https://github.com/tada5hi/ilingo/compare/fs-v5.0.0...fs-v6.0.0) (2026-06-02)


### ⚠ BREAKING CHANGES

* the `Config` and `ConfigInput` exports are removed. Use `IlingoOptions` instead (e.g. import { IlingoOptions } from 'ilingo').
* MemoryStore({ data }) now requires a descriptor tree (defineCatalog([...])) rather than a plain { locale: { namespace: lines } } object; the @plural marker is replaced by definePlural() / a { type: 'plural', data } node; FSStore files and LoaderStore loaders return a lines node ({ type: 'lines', data }); Ilingo and IIlingo are no longer generic and get() keys are loose strings; @ilingo/validup no longer exports ValidupCatalog / ValidupCatalogEntries.
* `Ilingo.stores` is now a `Map<symbol|string, IStore>` (was `Set<IStore>`); `Ilingo.register(store)` is renamed to `registerStore(store)` and dedupes by `store.id`; `IStore` now requires a `readonly id`. `@ilingo/validup`'s `Store` / `createStore` / translations moved to the `@ilingo/validup/store/memory` subpath (`createStore` → `createMemoryStore`); the `register(ilingo)` helper was removed in favour of `ilingo.registerStore(createMemoryStore())`.
* **ilingo:** a get({ locale: 'X' }) call where 'X' has no data now falls through to the default locale rather than returning undefined. Pass fallback: [] to opt out (or pre-check via getResolvedLocale).

### Features

* descriptor-tree catalogs and remove type-safe key inference ([#959](https://github.com/tada5hi/ilingo/issues/959)) ([f61ee8c](https://github.com/tada5hi/ilingo/commit/f61ee8c00fc093e6efaee425736a97c1bdc48a5a))
* **fs:** persist FSStore.set to disk ([bab057a](https://github.com/tada5hi/ilingo/commit/bab057a003726d3929d7582679b5f05a4bcf7e14))
* **ilingo:** deprecate bare structural plural form ([#920](https://github.com/tada5hi/ilingo/issues/920)) ([21a5efa](https://github.com/tada5hi/ilingo/commit/21a5efafa14de01daa7e2e18104c8d00c7707ccf))
* **ilingo:** pluralization, fallback chain, missing-key handler ([#912](https://github.com/tada5hi/ilingo/issues/912)) ([b091bb4](https://github.com/tada5hi/ilingo/commit/b091bb4ba181163863ad17d9b9b56573796e476b))
* loader store + FSStore watch mode + invalidation API ([#919](https://github.com/tada5hi/ilingo/issues/919)) ([f615d35](https://github.com/tada5hi/ilingo/commit/f615d35c9ddf1fe28db75fa479c6a31d8032de0e))
* validup bridge — new @ilingo/validup(-vue) packages + breaking catalog/store API ([#939](https://github.com/tada5hi/ilingo/issues/939)) ([f19f03f](https://github.com/tada5hi/ilingo/commit/f19f03f48f17e739f2b6ed533d4f8ddef59f92e0))


### Bug Fixes

* **deps:** bump the majorprod group across 1 directory with 2 updates ([#922](https://github.com/tada5hi/ilingo/issues/922)) ([5b2bf7d](https://github.com/tada5hi/ilingo/commit/5b2bf7d083c09438003057f8832664afd1444b7b))
* **fs:** adapt FSStore to locter v3 cwd option rename ([4f1cb64](https://github.com/tada5hi/ilingo/commit/4f1cb641f7006fde6d300b1dec80ab1145ef34aa))


### Code Refactoring

* remove dead code and realign docs after descriptor-tree migration ([#960](https://github.com/tada5hi/ilingo/issues/960)) ([0d1e798](https://github.com/tada5hi/ilingo/commit/0d1e7985b224812e33214699fdcdfa88bf579cef))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * ilingo bumped from ^5.0.0 to ^6.0.0

## [5.0.0](https://github.com/tada5hi/ilingo/compare/fs-v4.3.3...fs-v5.0.0) (2026-01-14)


### ⚠ BREAKING CHANGES

* esm only

### Bug Fixes

* bump dependencies ([fe0583c](https://github.com/tada5hi/ilingo/commit/fe0583c181575c769bfb3f9b18ee590d1ae1f020))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * ilingo bumped from ^4.4.1 to ^5.0.0

## [4.3.3](https://github.com/tada5hi/ilingo/compare/fs-v4.3.2...fs-v4.3.3) (2025-04-08)


### Bug Fixes

* **deps:** bump locter from 2.1.1 to 2.1.2 ([#698](https://github.com/tada5hi/ilingo/issues/698)) ([8ec3320](https://github.com/tada5hi/ilingo/commit/8ec332039934ed9340ec99ec8b2ba3ff4d97c30c))
* **deps:** bump pathe from 1.1.2 to 2.0.3 in the majorprod group ([#809](https://github.com/tada5hi/ilingo/issues/809)) ([9e10704](https://github.com/tada5hi/ilingo/commit/9e10704a7fa546618a591c2d8b498a4b04d4fe1d))
* **deps:** bump the minorandpatch group across 1 directory with 16 updates ([#816](https://github.com/tada5hi/ilingo/issues/816)) ([b336691](https://github.com/tada5hi/ilingo/commit/b33669162152e82e079791955f53d9ba2538b6b3))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * ilingo bumped from ^4.4.0 to ^4.4.1

## [4.3.2](https://github.com/tada5hi/ilingo/compare/fs-v4.3.1...fs-v4.3.2) (2024-09-02)


### Bug Fixes

* **deps:** bump locter from 2.1.0 to 2.1.1 ([#647](https://github.com/tada5hi/ilingo/issues/647)) ([e266925](https://github.com/tada5hi/ilingo/commit/e266925988ea1947663b0d12578bc8f251da2534))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * ilingo bumped from ^4.3.1 to ^4.4.0

## [4.3.1](https://github.com/tada5hi/ilingo/compare/fs-v4.3.0...fs-v4.3.1) (2024-04-22)


### Miscellaneous Chores

* **fs:** Synchronize main versions


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * ilingo bumped from ^4.3.0 to ^4.3.1

## [4.3.0](https://github.com/tada5hi/ilingo/compare/fs-v4.2.0...fs-v4.3.0) (2024-04-22)


### Miscellaneous Chores

* **fs:** Synchronize main versions


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * ilingo bumped from ^4.2.0 to ^4.3.0

## [4.2.0](https://github.com/tada5hi/ilingo/compare/fs-v4.1.1...fs-v4.2.0) (2024-04-21)


### Miscellaneous Chores

* **fs:** Synchronize main versions


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * ilingo bumped from ^4.1.1 to ^4.2.0

## [4.1.1](https://github.com/tada5hi/ilingo/compare/fs-v4.1.0...fs-v4.1.1) (2024-04-20)


### Miscellaneous Chores

* **fs:** Synchronize main versions


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * ilingo bumped from ^4.1.0 to ^4.1.1

## [4.1.0](https://github.com/tada5hi/ilingo/compare/fs-v4.0.0...fs-v4.1.0) (2024-04-19)


### Features

* enable export paths ([4a4e48a](https://github.com/tada5hi/ilingo/commit/4a4e48af5100abcfc533d91ca9b116fa93bf6b68))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * ilingo bumped from ^4.0.0 to ^4.1.0

## [4.0.0](https://github.com/tada5hi/ilingo/compare/fs-v3.2.0...fs-v4.0.0) (2024-04-19)


### ⚠ BREAKING CHANGES

* Public API changed

### Features

* add ilingo package as export path ([0aeea39](https://github.com/tada5hi/ilingo/commit/0aeea39f054ed7e66529cb756554a8e4e0024686))
* change memory store constructor ([9e9759b](https://github.com/tada5hi/ilingo/commit/9e9759b98eb85afeaa7f6ee4984246937c88337d))
* remove setter for ilingo class + use set instead of map ([f9da1dd](https://github.com/tada5hi/ilingo/commit/f9da1dd82df396674ad693770bb7b681140218d0))
* remove synchronous setter/getter ([#425](https://github.com/tada5hi/ilingo/issues/425)) ([23221b0](https://github.com/tada5hi/ilingo/commit/23221b07c7cac865adc2cdb98c55e7904f15fd40))
* simplify get/set api ([#438](https://github.com/tada5hi/ilingo/issues/438)) ([989f31a](https://github.com/tada5hi/ilingo/commit/989f31a3d38b6c08a776e9afe9db2df3e05fd44c))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * ilingo bumped from ^3.2.0 to ^4.0.0

## [3.2.0](https://github.com/tada5hi/ilingo/compare/fs-v3.1.0...fs-v3.2.0) (2024-04-02)


### Features

* implemented getLocales(Sync) to receive available locales ([#411](https://github.com/tada5hi/ilingo/issues/411)) ([a37c8bb](https://github.com/tada5hi/ilingo/commit/a37c8bb45f820d8480701f9737cb2248c9f6fb50))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * ilingo bumped from ^3.1.0 to ^3.2.0

## [3.1.0](https://github.com/tada5hi/ilingo/compare/fs-v3.0.0...fs-v3.1.0) (2024-04-01)


### Bug Fixes

* bump locter to v2.0.2 ([73bb252](https://github.com/tada5hi/ilingo/commit/73bb25284e64e8486d7f6e38caf8ecc270199a0e))
* **deps:** bump pathe from 1.1.0 to 1.1.1 ([#319](https://github.com/tada5hi/ilingo/issues/319)) ([6c385e2](https://github.com/tada5hi/ilingo/commit/6c385e242225dba5b2944ae7ddd1735db795789b))
* **deps:** bump pathe from 1.1.1 to 1.1.2 ([#360](https://github.com/tada5hi/ilingo/issues/360)) ([9e0f11c](https://github.com/tada5hi/ilingo/commit/9e0f11c358a19f0b1ccd13be88c8eac704409a1a))
* **deps:** bump smob from 1.4.0 to 1.4.1 ([#368](https://github.com/tada5hi/ilingo/issues/368)) ([28ed320](https://github.com/tada5hi/ilingo/commit/28ed3202f59c5e6c0f5c1a5ed223caf7678a3882))
* **deps:** bump smob from 1.4.1 to 1.5.0 ([#409](https://github.com/tada5hi/ilingo/issues/409)) ([d819dc2](https://github.com/tada5hi/ilingo/commit/d819dc2e715a0a8ad03191a32121e5d04c26e8b6))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * ilingo bumped from ^3.0.0 to ^3.1.0

## Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [3.0.0](https://github.com/tada5hi/ilingo/compare/v3.0.0-alpha.2...v3.0.0) (2023-05-31)


### Bug Fixes

* remove store getter/setter ([1def83c](https://github.com/tada5hi/ilingo/commit/1def83cef5e0e88704461d06fc671d2556989ea7))





## [3.0.0-alpha.2](https://github.com/tada5hi/ilingo/compare/v3.0.0-alpha.1...v3.0.0-alpha.2) (2023-05-30)


### Bug Fixes

* bump smob to v1.4.x + updated usage ([f142b03](https://github.com/tada5hi/ilingo/commit/f142b038ac0b506369aac15052fba51b6997a1e4))
* **deps:** bump locter to v1.1.2 ([53ee30f](https://github.com/tada5hi/ilingo/commit/53ee30f56a7af00fea048c4fda135138cd4358e5))





## [3.0.0-alpha.1](https://github.com/tada5hi/ilingo/compare/v3.0.0-alpha.0...v3.0.0-alpha.1) (2023-05-07)


### Bug Fixes

* make fs package public ([35a87b1](https://github.com/tada5hi/ilingo/commit/35a87b13d0f7e75ed11400280506aa4a2d31569b))





## [3.0.0-alpha.0](https://github.com/tada5hi/ilingo/compare/v2.4.0...v3.0.0-alpha.0) (2023-05-07)


### Bug Fixes

* renamed fs-store class + better basic usage example(s) ([a6389fa](https://github.com/tada5hi/ilingo/commit/a6389fab956a2b6fd43c376f900045c6632e3bde))


### Features

* contextualize fs-store options + add default export for core package ([c72c355](https://github.com/tada5hi/ilingo/commit/c72c355c7cd9fbe1d4d879f01c902c667f350c63))
* memory-/fs-store & api refactoring ([#277](https://github.com/tada5hi/ilingo/issues/277)) ([27efe29](https://github.com/tada5hi/ilingo/commit/27efe2987e24269b53baa88ada336de5068a2180))
