/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { computedAsync } from '@vueuse/core';
import { injectIlingo, injectLocale } from '@ilingo/vue';
import { translateIssueGroups } from '@ilingo/validup';
import type { IssueGroupTranslation } from '@ilingo/validup';
import type { IssueGroup } from 'validup';
import type { MaybeRefOrGetter } from 'vue';
import { shallowRef, toValue } from 'vue';
import type { GroupTranslations } from '../types';

/**
 * Getter-based group translator shared by `useTranslationsForGroupErrors`
 * (composable-bound public surface) and `<IValidup :composable>`'s
 * `#groups` stream (which feeds a getter so the source can be empty when
 * the component is in `:issues` mode).
 *
 * Sibling of the exported `useTranslationsForIssues` — same flicker-free
 * `lastResolved` contract, but translates each group by its own `code`
 * via `translateIssueGroups` instead of flattening to leaves. Kept
 * **internal** (not re-exported from the package barrel): the documented
 * public entry point is the composable-bound `useTranslationsForGroupErrors`.
 */
export function useTranslatedGroups(
    source: MaybeRefOrGetter<IssueGroup[]>,
): GroupTranslations {
    const instance = injectIlingo();
    const locale = injectLocale();

    const lastResolved = shallowRef<IssueGroupTranslation[]>([]);

    return computedAsync<IssueGroupTranslation[]>(async () => {
        const groups = toValue(source);
        if (!groups || groups.length === 0) {
            lastResolved.value = [];
            return [];
        }
        const next = await translateIssueGroups(groups, instance, { locale: locale.value });
        lastResolved.value = next;
        return next;
    }, lastResolved.value);
}
