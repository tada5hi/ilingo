/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

/**
 * Run a synchronous seed computation, degrading to "no seed" if it throws.
 *
 * The composables in this package seed their `computedAsync` with a
 * synchronous translation so the first render already carries the messages
 * (#988). That lookup happens on the component's **synchronous setup path**,
 * which changes the blast radius of a throw: inside the `computedAsync`
 * callback an exception is absorbed by VueUse's `onError` (and surfaced via
 * `globalThis.reportError`), but on the setup path it aborts the mount.
 *
 * Concrete case: validup's `flattenIssueItems` treats an issue without a
 * string `code` as a group and recurses into its (absent) `issues`, throwing
 * `issues is not iterable`. The async pass has always hit that too — silently.
 * Seeding is an optimization, so it must never be able to make things worse
 * than not seeding; the async pass re-runs the same work and reports the
 * failure through its own channel.
 *
 * @internal
 */
export function trySeed<T>(compute: () => T | undefined): T | undefined {
    try {
        return compute();
    } catch {
        return undefined;
    }
}
