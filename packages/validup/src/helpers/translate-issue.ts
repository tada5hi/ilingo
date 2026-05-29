/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Ilingo } from 'ilingo';
import type { Issue, IssueItem } from 'validup';
import { flattenIssueItems } from 'validup';
import { GROUP } from '../constants';

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
    const code = issue.code;
    if (typeof code === 'string' && code.length > 0) {
        const translated = await ilingo.get({
            group: options.group ?? GROUP,
            key: code,
            data: issue.data,
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
    const output: Array<{ issue: IssueItem, message: string }> = [];
    for (const issue of flat) {
        const message = await translateIssue(issue, ilingo, options);
        output.push({ issue, message });
    }
    return output;
}
