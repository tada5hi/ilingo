/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { matchesInstanceof } from '@ebec/core';
import { ILINGO_ERROR_INSTANCE, SYNC_UNAVAILABLE_ERROR_INSTANCE } from './constants';
import type { IlingoError } from './base';
import type { SyncUnavailableError } from './sync-unavailable';

/**
 * Type guard for {@link IlingoError} — "did this come from ilingo?".
 *
 * Marker-based, so prefer it over a bare `instanceof` at any boundary the error
 * may cross: it holds when the error was constructed by a *different copy* of
 * `ilingo` (thrown inside `@ilingo/fs`, caught in an app), it matches every
 * subclass through the shared `@instanceof` chain, and it recognises an error
 * rehydrated from `toJSON()`, which no `instanceof` can.
 */
export function isIlingoError(input: unknown): input is IlingoError {
    return matchesInstanceof(input, ILINGO_ERROR_INSTANCE);
}

/**
 * Type guard for {@link SyncUnavailableError}. Marker-based, so it holds across
 * duplicate package copies — use it instead of a bare `instanceof` at any
 * boundary where the error may have been constructed by another copy of
 * `ilingo` (e.g. thrown inside `@ilingo/fs`, caught in an app). It also matches
 * an error rehydrated from `toJSON()`, which no `instanceof` can.
 *
 * Expect it as ordinary control flow on any code path that seeds from a
 * synchronous read.
 */
export function isSyncUnavailableError(input: unknown): input is SyncUnavailableError {
    return matchesInstanceof(input, SYNC_UNAVAILABLE_ERROR_INSTANCE);
}
