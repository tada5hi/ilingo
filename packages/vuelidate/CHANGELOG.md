# Changelog

## [5.0.4](https://github.com/tada5hi/ilingo/compare/vuelidate-v5.0.3...vuelidate-v5.0.4) (2025-04-08)


### Bug Fixes

* **deps:** bump the minorandpatch group across 1 directory with 16 updates ([#816](https://github.com/tada5hi/ilingo/issues/816)) ([b336691](https://github.com/tada5hi/ilingo/commit/b33669162152e82e079791955f53d9ba2538b6b3))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @ilingo/vue bumped from ^4.3.2 to ^4.3.3
    * ilingo bumped from ^4.4.0 to ^4.4.1
  * peerDependencies
    * @ilingo/vue bumped from ^4.3.2 to ^4.3.3
    * ilingo bumped from ^4.4.0 to ^4.4.1

## [5.0.3](https://github.com/tada5hi/ilingo/compare/vuelidate-v5.0.2...vuelidate-v5.0.3) (2024-09-02)


### Bug Fixes

* don't inject instance and locale multiple times ([928d483](https://github.com/tada5hi/ilingo/commit/928d483603f141feb43a38acd2b9aea855a500bc))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @ilingo/vue bumped from ^4.3.1 to ^4.3.2
    * ilingo bumped from ^4.3.1 to ^4.4.0
  * peerDependencies
    * @ilingo/vue bumped from ^4.3.1 to ^4.3.2
    * ilingo bumped from ^4.3.1 to ^4.4.0

## [5.0.2](https://github.com/tada5hi/ilingo/compare/vuelidate-v5.0.1...vuelidate-v5.0.2) (2024-05-10)


### Bug Fixes

* getSeverity composable signature ([9cc7625](https://github.com/tada5hi/ilingo/commit/9cc76254131de363c6c466ef54a26767095d88eb))

## [5.0.1](https://github.com/tada5hi/ilingo/compare/vuelidate-v5.0.0...vuelidate-v5.0.1) (2024-05-10)


### Bug Fixes

* typings for composables ([705bbf9](https://github.com/tada5hi/ilingo/commit/705bbf930290bfb9f9f2e31812bd59f90c82f3cd))

## [5.0.0](https://github.com/tada5hi/ilingo/compare/vuelidate-v4.3.1...vuelidate-v5.0.0) (2024-04-22)


### ⚠ BREAKING CHANGES

* Public API changed

### Features

* add ilingo package as export path ([0aeea39](https://github.com/tada5hi/ilingo/commit/0aeea39f054ed7e66529cb756554a8e4e0024686))
* add vue export path ([969e1cb](https://github.com/tada5hi/ilingo/commit/969e1cb3bec1a65879d103d2829891acde197718))
* avoid multiple di provision & simplified vuelidate plugin ([399d3d3](https://github.com/tada5hi/ilingo/commit/399d3d3c676ee89b7e5470453813c9fafde931b8))
* change memory store constructor ([9e9759b](https://github.com/tada5hi/ilingo/commit/9e9759b98eb85afeaa7f6ee4984246937c88337d))
* initial vuelidate implementation ([3839589](https://github.com/tada5hi/ilingo/commit/383958902729e933e2c746075d6806a766cb353d))
* multiple stores & vuelidate translations ([#437](https://github.com/tada5hi/ilingo/issues/437)) ([f6087c5](https://github.com/tada5hi/ilingo/commit/f6087c5baead7a59df07cc22400423a30ce9b652))
* new helper for nested validations ([4656e47](https://github.com/tada5hi/ilingo/commit/4656e470fb9e3c8b793f08d0670253e4e129846d))
* provide utility to create vuelidate store ([9486ae3](https://github.com/tada5hi/ilingo/commit/9486ae3f55471d60b1a3209693b37c694b5e0a4f))
* remove setter for ilingo class + use set instead of map ([f9da1dd](https://github.com/tada5hi/ilingo/commit/f9da1dd82df396674ad693770bb7b681140218d0))
* remove singleton feature + optimized vue/vuelidate plugin install ([e87b1cb](https://github.com/tada5hi/ilingo/commit/e87b1cbc8b671f34906dda6f53d1113f8e1e2811))
* remove synchronous setter/getter ([#425](https://github.com/tada5hi/ilingo/issues/425)) ([23221b0](https://github.com/tada5hi/ilingo/commit/23221b07c7cac865adc2cdb98c55e7904f15fd40))
* severity implementation with composables + component slots ([#461](https://github.com/tada5hi/ilingo/issues/461)) ([986cf04](https://github.com/tada5hi/ilingo/commit/986cf04e67c334b296f10cbad8edad6bfa42d8c2))
* simplify get/set api ([#438](https://github.com/tada5hi/ilingo/issues/438)) ([989f31a](https://github.com/tada5hi/ilingo/commit/989f31a3d38b6c08a776e9afe9db2df3e05fd44c))


### Bug Fixes

* build & updated README.mds ([4154ed2](https://github.com/tada5hi/ilingo/commit/4154ed20f7a4a330260399286d32a9c8454592db))
* change default ilingo prefix for vuelidate to ([299fa2f](https://github.com/tada5hi/ilingo/commit/299fa2f6024c94c38daee7d35a1950654d6f0146))
* prop typing of IVuelidate component ([c2bb84d](https://github.com/tada5hi/ilingo/commit/c2bb84de4f9b713f1636e4df6f52e3fbd71212cf))
* typings for severity helper and composable ([f69c2de](https://github.com/tada5hi/ilingo/commit/f69c2de4db3dc986cb1fe9d4d962b1590870ce82))

## [4.3.1](https://github.com/tada5hi/ilingo/compare/vue-v4.3.0...vue-v4.3.1) (2024-04-22)


### Bug Fixes

* typings for severity helper and composable ([f69c2de](https://github.com/tada5hi/ilingo/commit/f69c2de4db3dc986cb1fe9d4d962b1590870ce82))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @ilingo/vue bumped from ^4.3.0 to ^4.3.1
    * ilingo bumped from ^4.3.0 to ^4.3.1
  * peerDependencies
    * @ilingo/vue bumped from ^4.3.0 to ^4.3.1
    * ilingo bumped from ^4.3.0 to ^4.3.1

## [4.3.0](https://github.com/tada5hi/ilingo/compare/vue-v4.2.0...vue-v4.3.0) (2024-04-22)


### Features

* severity implementation with composables + component slots ([#461](https://github.com/tada5hi/ilingo/issues/461)) ([986cf04](https://github.com/tada5hi/ilingo/commit/986cf04e67c334b296f10cbad8edad6bfa42d8c2))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @ilingo/vue bumped from ^4.2.0 to ^4.3.0
    * ilingo bumped from ^4.2.0 to ^4.3.0
  * peerDependencies
    * @ilingo/vue bumped from ^4.2.0 to ^4.3.0
    * ilingo bumped from ^4.2.0 to ^4.3.0

## [4.2.0](https://github.com/tada5hi/ilingo/compare/vue-v4.1.1...vue-v4.2.0) (2024-04-21)


### Miscellaneous Chores

* **vue:** Synchronize main versions


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @ilingo/vue bumped from ^4.1.1 to ^4.2.0
    * ilingo bumped from ^4.1.1 to ^4.2.0
  * peerDependencies
    * @ilingo/vue bumped from ^4.1.1 to ^4.2.0
    * ilingo bumped from ^4.1.1 to ^4.2.0

## [4.1.1](https://github.com/tada5hi/ilingo/compare/vue-v4.1.0...vue-v4.1.1) (2024-04-20)


### Miscellaneous Chores

* **vue:** Synchronize main versions


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @ilingo/vue bumped from ^4.1.0 to ^4.1.1
    * ilingo bumped from ^4.1.0 to ^4.1.1
  * peerDependencies
    * @ilingo/vue bumped from ^4.1.0 to ^4.1.1
    * ilingo bumped from ^4.1.0 to ^4.1.1

## [4.1.0](https://github.com/tada5hi/ilingo/compare/vue-v4.0.0...vue-v4.1.0) (2024-04-19)


### Features

* add vue export path ([969e1cb](https://github.com/tada5hi/ilingo/commit/969e1cb3bec1a65879d103d2829891acde197718))
* new helper for nested validations ([4656e47](https://github.com/tada5hi/ilingo/commit/4656e470fb9e3c8b793f08d0670253e4e129846d))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @ilingo/vue bumped from ^4.0.0 to ^4.1.0
    * ilingo bumped from ^4.0.0 to ^4.1.0
  * peerDependencies
    * @ilingo/vue bumped from ^4.0.0 to ^4.1.0
    * ilingo bumped from ^4.0.0 to ^4.1.0

## 4.0.0 (2024-04-19)


### ⚠ BREAKING CHANGES

* Public API changed

### Features

* add ilingo package as export path ([0aeea39](https://github.com/tada5hi/ilingo/commit/0aeea39f054ed7e66529cb756554a8e4e0024686))
* avoid multiple di provision & simplified vuelidate plugin ([399d3d3](https://github.com/tada5hi/ilingo/commit/399d3d3c676ee89b7e5470453813c9fafde931b8))
* change memory store constructor ([9e9759b](https://github.com/tada5hi/ilingo/commit/9e9759b98eb85afeaa7f6ee4984246937c88337d))
* initial vuelidate implementation ([3839589](https://github.com/tada5hi/ilingo/commit/383958902729e933e2c746075d6806a766cb353d))
* multiple stores & vuelidate translations ([#437](https://github.com/tada5hi/ilingo/issues/437)) ([f6087c5](https://github.com/tada5hi/ilingo/commit/f6087c5baead7a59df07cc22400423a30ce9b652))
* provide utility to create vuelidate store ([9486ae3](https://github.com/tada5hi/ilingo/commit/9486ae3f55471d60b1a3209693b37c694b5e0a4f))
* remove setter for ilingo class + use set instead of map ([f9da1dd](https://github.com/tada5hi/ilingo/commit/f9da1dd82df396674ad693770bb7b681140218d0))
* remove singleton feature + optimized vue/vuelidate plugin install ([e87b1cb](https://github.com/tada5hi/ilingo/commit/e87b1cbc8b671f34906dda6f53d1113f8e1e2811))
* remove synchronous setter/getter ([#425](https://github.com/tada5hi/ilingo/issues/425)) ([23221b0](https://github.com/tada5hi/ilingo/commit/23221b07c7cac865adc2cdb98c55e7904f15fd40))
* simplify get/set api ([#438](https://github.com/tada5hi/ilingo/issues/438)) ([989f31a](https://github.com/tada5hi/ilingo/commit/989f31a3d38b6c08a776e9afe9db2df3e05fd44c))


### Bug Fixes

* build & updated README.mds ([4154ed2](https://github.com/tada5hi/ilingo/commit/4154ed20f7a4a330260399286d32a9c8454592db))
* change default ilingo prefix for vuelidate to ([299fa2f](https://github.com/tada5hi/ilingo/commit/299fa2f6024c94c38daee7d35a1950654d6f0146))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @ilingo/vue bumped from ^3.2.0 to ^4.0.0
    * ilingo bumped from ^3.2.0 to ^4.0.0
  * peerDependencies
    * @ilingo/vue bumped from ^3.2.0 to ^4.0.0
    * ilingo bumped from ^3.2.0 to ^4.0.0
