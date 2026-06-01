/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Composable } from '@validup/vue';
import type { ObjectLiteral } from 'validup';
import type { MaybeRef } from 'vue';
import { unref } from 'vue';
import type { GroupTranslations } from '../types';
import { useTranslatedGroups } from './shared';

/**
 * Translate the **group-level** errors (`$groupErrors`) of a
 * `@validup/vue` `Composable<T>` to localized messages.
 *
 * `$groupErrors` carries top-level `IssueGroup`s — e.g. `ONE_OF_FAILED`
 * wrapping a `oneOf` container. Semantically these are "the form's shape
 * is wrong" errors and usually want their own banner, not per-field
 * rendering. This composable translates each group by its **own** `code`
 * (via `translateIssueGroups`) **without** descending into its children
 * — composing `useTranslationsForIssues(() => $v.$groupErrors.value)`
 * instead would flatten into the per-branch leaves, which is *not* what
 * group-level rendering wants.
 *
 * Returns a `Ref<IssueGroupTranslation[]>` that re-runs whenever
 * `$groupErrors` changes or the injected locale flips. The injected
 * `Ilingo` instance and locale `Ref` come from the `@ilingo/vue` plugin
 * — call `install(app, …)` first.
 *
 * **Flicker-free locale switching:** the previously-resolved batch stays
 * visible until the next one resolves, mirroring `useTranslationsForIssues`
 * — a locale flip on a form with a visible group banner doesn't blank it
 * for a tick.
 */
export function useTranslationsForGroupErrors<T extends ObjectLiteral = ObjectLiteral>(
    composable: MaybeRef<Composable<T>>,
): GroupTranslations {
    return useTranslatedGroups(() => unref(composable).$groupErrors.value);
}
