/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

/**
 * Internal protocol for deriving a parallel sync + async pair from **one**
 * body — the same scheme `locter` uses to keep `locate`/`locateSync` and
 * `load`/`loadSync` honest.
 *
 * A body is a generator that yields effect *pairs*: an async thunk and a sync
 * thunk for the same operation. The two drivers below run the side they stand
 * for. Effect errors are re-entered into the body via `Generator.throw`, so a
 * `try`/`catch` inside a body behaves identically in both variants.
 *
 * Why bother, when a store has only a handful of these: the two variants must
 * agree on *everything* around the I/O — cache bookkeeping, the loaded flag,
 * the invalidation generation guard, the merge order. Two hand-written copies
 * drift, and when they do, `get` and `getSync` disagree about what the store
 * holds. That is the exact bug class this package kept hitting while the
 * synchronous read path was built (see #988); one body cannot drift from
 * itself.
 *
 * Deliberately **not** re-exported from the package barrel — internal
 * plumbing, not public API.
 */

export type TwinOp<T = unknown> = {
    async(): Promise<T>,
    sync(): T,
};

export type TwinBody<R> = Generator<TwinOp<any>, R, any>;

/**
 * Perform one effect inside a twin body: `const x = yield* op(asyncFn, syncFn)`.
 */
export function* op<T>(
    asyncFn: () => Promise<T>,
    syncFn: () => T,
): Generator<TwinOp<T>, T, T> {
    return yield { async: asyncFn, sync: syncFn };
}

// `IteratorResult`'s `done` discriminant only narrows `value` under
// `strictNullChecks`, which this repo has off — hence the explicit casts.
export async function runTwinAsync<R>(body: TwinBody<R>): Promise<R> {
    let step = body.next();
    while (!step.done) {
        let result: unknown;
        try {
            result = await (step.value as TwinOp).async();
        } catch (e) {
            step = body.throw(e);
            continue;
        }

        step = body.next(result);
    }

    return step.value as R;
}

export function runTwinSync<R>(body: TwinBody<R>): R {
    let step = body.next();
    while (!step.done) {
        let result: unknown;
        try {
            result = (step.value as TwinOp).sync();
        } catch (e) {
            step = body.throw(e);
            continue;
        }

        step = body.next(result);
    }

    return step.value as R;
}
