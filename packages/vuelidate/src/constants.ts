/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

/**
 * Catalog group name used by the shipped vuelidate-message stores. All
 * keys under this group are built-in validator names.
 */
export const GROUP = 'vuelidate';

/**
 * Stable identity under which the shipped catalog stores
 * (`createMemoryStore()` / `createLoaderStore()`) register themselves on an
 * `Ilingo` instance. A `Symbol.for(...)` global-registry symbol, so two
 * copies of `@ilingo/vuelidate` (pnpm / peer-dep mismatch) resolve to the
 * *same* key and `ilingo.registerStore(...)` stays idempotent across them.
 *
 * Lives in `constants.ts` (not a store module) so it is importable without
 * pulling any translation data into the bundle — the eager `memory` and
 * lazy `loader` entry points both reference it.
 */
export const STORE_ID = Symbol.for('@ilingo/vuelidate');

export enum Severity {
    WARNING = 'warning',
    ERROR = 'error',
}

export enum SlotName {
    DEFAULT = 'default',
}
