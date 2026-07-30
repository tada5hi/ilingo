/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export const ILINGO_ERROR_MARKER = Symbol.for('ilingo.error');

/**
 * Base class for every error thrown by ilingo itself, so a consumer can catch
 * "anything from this library" in one clause. Errors surfacing from a store's
 * own backend (a file read, an HTTP call) are **not** wrapped — they propagate
 * untouched, matching the existing contract that ilingo owns no error wrapper.
 *
 * Identity is carried by a `Symbol.for` marker plus a `[Symbol.hasInstance]`
 * override rather than the prototype chain alone, so `instanceof` still holds
 * across duplicate package copies (pnpm, a peer-dependency mismatch, a bundler
 * that inlines a second copy of `ilingo`). A subclass thrown by the copy inside
 * `@ilingo/fs` must be recognisable to a `catch` in the app's copy — the same
 * reasoning that makes library catalog stores key themselves with
 * `Symbol.for('@scope/pkg')`.
 *
 * Mirrors the convention in the sibling packages (`LocterError` in locter,
 * `ConfinityError` in confinity), minus the `@ebec/core` base class: `ilingo`
 * ships to browsers under a bundle-size budget and this is the only place in
 * core that needs it.
 */
export class IlingoError extends Error {
    static override [Symbol.hasInstance](input: unknown): boolean {
        return hasErrorMarker(input, ILINGO_ERROR_MARKER);
    }

    constructor(message: string, options?: ErrorOptions) {
        super(message, options);

        // `new.target.name` rather than a hard-coded string, so a subclass
        // reports its own name without restating it.
        this.name = new.target.name;

        markError(this, ILINGO_ERROR_MARKER);
    }
}

/**
 * Tag an error instance with a marker symbol. Non-enumerable so the marker
 * never shows up in serialisation of the error.
 */
export function markError(error: object, marker: symbol): void {
    Object.defineProperty(error, marker, {
        value: true,
        enumerable: false,
        configurable: true,
    });
}

/**
 * Marker-based `instanceof` check — the reader half of {@link markError}.
 */
export function hasErrorMarker(input: unknown, marker: symbol): boolean {
    return typeof input === 'object' &&
        input !== null &&
        (input as Record<symbol, unknown>)[marker] === true;
}
