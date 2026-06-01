/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

/**
 * Catalog namespace name used by the default store. All keys under this
 * namespace are validup `IssueCode` runtime values (e.g. `value_invalid`,
 * `one_of_failed`).
 */
export const NAMESPACE = 'validup';

/**
 * Stable identity under which the shipped catalog stores
 * (`createMemoryStore()` / `createLoaderStore()`) register themselves on an
 * `Ilingo` instance. A `Symbol.for(...)` global-registry symbol, so two
 * copies of `@ilingo/validup` (pnpm / peer-dep mismatch) resolve to the
 * *same* key and `ilingo.registerStore(...)` stays idempotent across them.
 *
 * Lives in `constants.ts` (not a store module) so it is importable without
 * pulling any translation data into the bundle — the eager `memory` and
 * lazy `loader` entry points both reference it.
 */
export const STORE_ID = Symbol.for('@ilingo/validup');

export enum SlotName {
    DEFAULT = 'default',
    /** Whole-form `<IValidup :composable>` channels (see issue #948). */
    CROSS_CUTTING = 'cross-cutting',
    GROUPS = 'groups',
    FIELDS = 'fields',
}
