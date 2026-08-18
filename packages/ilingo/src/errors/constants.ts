/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

/**
 * Class markers, following the `<pkg>/<ClassName>` convention the family
 * shares (`@ebec/core/BaseError`, `validup/ValidupError`).
 *
 * They live apart from the classes so `check.ts` can read them without
 * importing a class module that, in turn, imports the guards back for its
 * `[Symbol.hasInstance]` — that would be a runtime import cycle.
 */

export const ILINGO_ERROR_INSTANCE = Symbol.for('ilingo/IlingoError');

export const SYNC_UNAVAILABLE_ERROR_INSTANCE = Symbol.for('ilingo/SyncUnavailableError');
