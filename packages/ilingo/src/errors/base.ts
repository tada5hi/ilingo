/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BaseError, markInstanceof } from '@ebec/core';
import { isIlingoError } from './check';
import { ILINGO_ERROR_INSTANCE } from './constants';

/**
 * Base class for every error thrown by ilingo itself, so a consumer can catch
 * "anything from this library" in one clause. Errors surfacing from a store's
 * own backend (a file read, an HTTP call) are **not** wrapped — they propagate
 * untouched, matching the existing contract that ilingo owns no error wrapper.
 *
 * Extends `@ebec/core`'s `BaseError`, the same base `LocterError` (locter) and
 * `ValidupError` (validup) build on, so an ilingo error carries a `code`, a
 * `cause` and a `toJSON()` for transport, and answers `isBaseError()` across
 * the whole family.
 *
 * Identity is carried by a `Symbol.for` marker plus a `[Symbol.hasInstance]`
 * override rather than the prototype chain alone, so `instanceof` still holds
 * across duplicate package copies (pnpm, a peer-dependency mismatch, a bundler
 * that inlines a second copy of `ilingo`). A subclass thrown by the copy inside
 * `@ilingo/fs` must be recognisable to a `catch` in the app's copy — the same
 * reasoning that makes library catalog stores key themselves with
 * `Symbol.for('@scope/pkg')`. The marker rides `@ebec/core`'s `@instanceof`
 * chain, so subclasses accumulate their ancestors' markers and — because
 * `matchesInstanceof` also reads the chain's serialized string form — the
 * identity survives a `toJSON()` round-trip too.
 */
export class IlingoError extends BaseError {
    static override [Symbol.hasInstance](input: unknown): boolean {
        return isIlingoError(input);
    }

    constructor(message: string, options: ErrorOptions = {}) {
        // `BaseError` sets `name` from `new.target.name` and derives `code`
        // from the class name, so a subclass reports both without restating.
        super({ ...options, message });

        markInstanceof(this, ILINGO_ERROR_INSTANCE);
    }
}

