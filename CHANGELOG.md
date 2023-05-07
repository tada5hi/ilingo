# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [3.0.0-alpha.1](https://github.com/tada5hi/ilingo/compare/v3.0.0-alpha.0...v3.0.0-alpha.1) (2023-05-07)


### Bug Fixes

* make fs package public ([35a87b1](https://github.com/tada5hi/ilingo/commit/35a87b13d0f7e75ed11400280506aa4a2d31569b))





# [3.0.0-alpha.0](https://github.com/tada5hi/ilingo/compare/v2.4.0...v3.0.0-alpha.0) (2023-05-07)


### Bug Fixes

* renamed fs-store class + better basic usage example(s) ([a6389fa](https://github.com/tada5hi/ilingo/commit/a6389fab956a2b6fd43c376f900045c6632e3bde))


### Features

* add applyConfig class method + README.md update ([8aba25c](https://github.com/tada5hi/ilingo/commit/8aba25c5e3bb2201867abb05725f8506ee6b2081))
* cleanup public api ([508d968](https://github.com/tada5hi/ilingo/commit/508d968a1c6df3e24a7459b368929da074f77947))
* contextualize fs-store options + add default export for core package ([c72c355](https://github.com/tada5hi/ilingo/commit/c72c355c7cd9fbe1d4d879f01c902c667f350c63))
* memory-/fs-store & api refactoring ([#277](https://github.com/tada5hi/ilingo/issues/277)) ([27efe29](https://github.com/tada5hi/ilingo/commit/27efe2987e24269b53baa88ada336de5068a2180))
* reduce singelton instances to one ([3ecb568](https://github.com/tada5hi/ilingo/commit/3ecb568e45ff14d38b25e9a76863b273227076d7))
* refactor singleton management + implemented config management ([25defe6](https://github.com/tada5hi/ilingo/commit/25defe66f52973d8ba53db1ebc72bdcd72cca1b0))
* set and overwrite deep nested key paths ([aa0ed0c](https://github.com/tada5hi/ilingo/commit/aa0ed0c45a66f180d3b89846dda342e736ab5ed7))
* use locter for file locating and loading ([52439d9](https://github.com/tada5hi/ilingo/commit/52439d90187533b646056dc3c60020f4d90393fd))


### BREAKING CHANGES

* singelton management api changed





## v2.4.0

[compare changes](https://github.com/tada5hi/ilingo/compare/v2.3.1...v2.4.0)


### 🚀 Enhancements

  - Only replace template var if it exists ([8960e7f](https://github.com/tada5hi/ilingo/commit/8960e7f))

### ❤️  Contributors

- Tada5hi <peter.placzek1996@gmail.com>

## v2.3.1

[compare changes](https://github.com/tada5hi/ilingo/compare/v2.3.0...v2.3.1)


### 🩹 Fixes

  - Remove and replaced lodash template with internal implementation ([558ca28](https://github.com/tada5hi/ilingo/commit/558ca28))

### ❤️  Contributors

- Tada5hi <peter.placzek1996@gmail.com>

## v2.3.0

[compare changes](https://github.com/tada5hi/ilingo/compare/v2.2.1...v2.3.0)


### 🚀 Enhancements

  - Soft format translation mesasge + replaced lodash with lodash.template ([c58826c](https://github.com/tada5hi/ilingo/commit/c58826c))

### 📦 Build

  - **deps-dev:** Bump rollup from 3.11.0 to 3.12.1 ([#223](https://github.com/tada5hi/ilingo/pull/223))
  - **deps-dev:** Bump @swc/core from 1.3.29 to 1.3.32 ([#222](https://github.com/tada5hi/ilingo/pull/222))
  - **deps-dev:** Bump typescript from 4.9.4 to 4.9.5 ([#219](https://github.com/tada5hi/ilingo/pull/219))
  - **deps-dev:** Bump eslint from 8.32.0 to 8.33.0 ([#216](https://github.com/tada5hi/ilingo/pull/216))
  - **deps-dev:** Bump @tada5hi/eslint-config-typescript ([#234](https://github.com/tada5hi/ilingo/pull/234))
  - **deps-dev:** Bump eslint from 8.33.0 to 8.34.0 ([#230](https://github.com/tada5hi/ilingo/pull/230))
  - **deps-dev:** Bump @types/node from 18.11.18 to 18.14.0 ([#233](https://github.com/tada5hi/ilingo/pull/233))
  - **deps-dev:** Bump @swc/core from 1.3.32 to 1.3.35 ([#229](https://github.com/tada5hi/ilingo/pull/229))
  - **deps-dev:** Bump rollup from 3.12.1 to 3.20.2 ([#249](https://github.com/tada5hi/ilingo/pull/249))
  - Simplified commitlint configuration ([0212f6c](https://github.com/tada5hi/ilingo/commit/0212f6c))
  - **deps-dev:** Update depedendencies ([c351bc1](https://github.com/tada5hi/ilingo/commit/c351bc1))
  - **deps-dev:** Bump jest & ts-jest ([a5ae22a](https://github.com/tada5hi/ilingo/commit/a5ae22a))
  - Remove rootDir from jest config ([c0f6925](https://github.com/tada5hi/ilingo/commit/c0f6925))
  - Replaced semantic-release with changelogen ([342da88](https://github.com/tada5hi/ilingo/commit/342da88))
  - Run tests on macos ([ba4a54f](https://github.com/tada5hi/ilingo/commit/ba4a54f))
  - Try ubuntu-20.04 for running workflow jobs ([d8abdc4](https://github.com/tada5hi/ilingo/commit/d8abdc4))

### ✅ Tests

  - Adjusted jest transform path ([f87d29d](https://github.com/tada5hi/ilingo/commit/f87d29d))

### ❤️  Contributors

- Tada5hi <peter.placzek1996@gmail.com>

## [2.2.1](https://github.com/tada5hi/ilingo/compare/v2.2.0...v2.2.1) (2023-01-27)


### Bug Fixes

* avoid named import of lodash ([64c7e55](https://github.com/tada5hi/ilingo/commit/64c7e551c6ea3b4c51ee13cb3dcaa82e266e7119))

# [2.2.0](https://github.com/tada5hi/ilingo/compare/v2.1.1...v2.2.0) (2023-01-27)


### Features

* replaced esbuild with swc ([7fd477a](https://github.com/tada5hi/ilingo/commit/7fd477a4a33e9936fe5133c7f928959aac52a8a3))

## [2.1.1](https://github.com/tada5hi/ilingo/compare/v2.1.0...v2.1.1) (2023-01-24)


### Bug Fixes

* **deps:** bump regenerator-runtime from 0.13.10 to 0.13.11 ([#208](https://github.com/tada5hi/ilingo/issues/208)) ([96c3a58](https://github.com/tada5hi/ilingo/commit/96c3a582e2bc3ac46688fc28630d892e0ad4b1c1))

# [2.1.0](https://github.com/tada5hi/ilingo/compare/v2.0.5...v2.1.0) (2023-01-20)


### Bug Fixes

* **deps:** bump json5 from 1.0.1 to 1.0.2 ([29a16c8](https://github.com/tada5hi/ilingo/commit/29a16c8a84cd4beb56b57ae2ab108cbc5a47684c))


### Features

* bump dependencies + updated build pipeline ([0e8fd77](https://github.com/tada5hi/ilingo/commit/0e8fd775ae53c68c35f15bf0d94626cc4e90a72a))

## [2.0.5](https://github.com/tada5hi/ilingo/compare/v2.0.4...v2.0.5) (2022-10-24)


### Bug Fixes

* **deps:** bump regenerator-runtime from 0.13.9 to 0.13.10 ([2876c59](https://github.com/tada5hi/ilingo/commit/2876c595c442c611b3848bbd11eb74119f5f85e0))
