/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { isProductionEnv } from 'ilingo';
import type { Ilingo } from 'ilingo';
import type { Issue, IssueItem } from 'validup';
import { flattenIssueItems } from 'validup';
import { GROUP } from '../constants';

/**
 * Coerce validup's `Record<string, unknown>` issue-data shape into
 * ilingo's narrower `Record<string, string | number>`. The documented
 * built-in `IssueCode` vocabulary uses string/number values; extension
 * codes — registered by consumers via `IssueDataByCode` declaration
 * merging — can carry anything. Without this coercion an issue with
 * `data: { other: someObject }` would silently render
 * `"Must equal [object Object]"` in the user-facing message.
 *
 * Strategy:
 *
 * - `string` / `number` pass through unchanged.
 * - `null` / `undefined` become the empty string (interpolation drops
 *   the placeholder cleanly).
 * - `boolean` stringifies to `"true"` / `"false"`.
 * - Objects, arrays, functions, symbols, bigints serialise via
 *   `JSON.stringify`, falling back to `String(value)` if that throws
 *   (cyclic references, BigInt before runtime support).
 *
 * Non-primitive coercions emit a one-shot dev-mode warning per
 * `(key, type)` so consumers notice and either flatten the issue data
 * upstream or register a custom formatter — `isProductionEnv()` keeps
 * production builds silent (browser + node, see the guard JSDoc).
 */
const warnedNonPrimitive = new Set<string>();

export function coerceIssueData(
    data: Record<string, unknown> | undefined,
): Record<string, string | number> | undefined {
    if (!data) {
        return undefined;
    }
    const output: Record<string, string | number> = {};
    for (const [key, value] of Object.entries(data)) {
        if (typeof value === 'string' || typeof value === 'number') {
            output[key] = value;
            continue;
        }
        if (value == null) {
            output[key] = '';
            continue;
        }
        if (typeof value === 'boolean') {
            output[key] = String(value);
            continue;
        }

        let serialized: string;
        try {
            const json = JSON.stringify(value);
            serialized = typeof json === 'string' ? json : String(value);
        } catch {
            serialized = String(value);
        }
        output[key] = serialized;

        if (!isProductionEnv()) {
            const id = `${key}|${typeof value}`;
            if (!warnedNonPrimitive.has(id)) {
                warnedNonPrimitive.add(id);
                // eslint-disable-next-line no-console
                console.warn(
                    `[@ilingo/validup] Issue data key "${key}" carries a ` +
                    `non-primitive value (${typeof value}); coerced to "${serialized}". ` +
                    'Flatten the value at the validator or register a custom formatter.',
                );
            }
        }
    }
    return output;
}

/**
 * Options for `translateIssue` / `translateIssues`.
 */
export interface TranslateIssueOptions {
    /**
     * Override the locale for this lookup. Defaults to the `Ilingo`
     * instance's current locale.
     */
    locale?: string;
    /**
     * Catalog group name to look up codes under. Defaults to `'validup'`
     * (the group used by the default `Store`). Override when you've
     * mounted the translations under a different group.
     */
    group?: string;
}

/**
 * Resolve a single validup `Issue` to a translated string via the
 * supplied `Ilingo` instance.
 *
 * Lookup order:
 * 1. If the issue has a `code` and the catalog has a matching entry,
 *    return it (with `issue.data` interpolated via ilingo's `{{name}}`
 *    syntax).
 * 2. Otherwise return the issue's eagerly-rendered `message` so the
 *    consumer always gets something displayable. The fallback message is
 *    the English default that validup attached at construction time.
 *
 * `IssueGroup`s are translated by their own `code` (e.g. `one_of_failed`).
 * Group children are not walked here — use `translateIssues` or
 * `flattenIssueItems` when you need leaf-level translations.
 */
export async function translateIssue(
    issue: Issue,
    ilingo: Ilingo,
    options: TranslateIssueOptions = {},
): Promise<string> {
    const { code } = issue;
    if (typeof code === 'string' && code.length > 0) {
        const translated = await ilingo.get({
            group: options.group ?? GROUP,
            key: code,
            // validup widens `IssueItem.data` to `Record<string, unknown>` to
            // cover the raw / ad-hoc branch. `coerceIssueData` narrows that
            // to ilingo's `Record<string, string | number>` at the boundary,
            // stringifying non-primitives (with a one-shot dev-mode warning)
            // instead of letting them reach the interpolator as
            // `[object Object]`.
            data: coerceIssueData(issue.data),
            locale: options.locale,
        });
        if (typeof translated === 'string' && translated.length > 0) {
            return translated;
        }
    }
    return issue.message;
}

/**
 * Flatten an `Issue[]` to its leaf `IssueItem`s and translate each via
 * `translateIssue`. The returned array preserves the flatten order, so a
 * consumer can zip it back against the original tree if needed.
 *
 * Translations fire in parallel via `Promise.all` — for N leaf issues this
 * is one batch, not N serial awaits. Sync stores (`MemoryStore`) finish in
 * a single microtask burst; async stores (`LoaderStore`, `FSStore` cold
 * load) overlap their I/O instead of stacking it. The store-level
 * dedup on `(locale, group, key)` means repeated identical lookups
 * (common on a form with many fields hitting the same code) cost no extra
 * work at the underlying stores.
 *
 * For a Vue-reactive flavor, use `useTranslationsForIssues` from this
 * package instead — it wraps this function in a `computedAsync` that
 * re-runs on locale / issue changes.
 */
export async function translateIssues(
    issues: Issue[],
    ilingo: Ilingo,
    options: TranslateIssueOptions = {},
): Promise<Array<{ issue: IssueItem, message: string }>> {
    const flat = flattenIssueItems(issues);
    const messages = await Promise.all(
        flat.map((issue) => translateIssue(issue, ilingo, options)),
    );
    return flat.map((issue, i) => ({ issue, message: messages[i]! }));
}
