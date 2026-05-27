/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { computedAsync } from '@vueuse/core';
import { injectIlingo, injectLocale } from '@ilingo/vue';
import type { Issue } from 'validup';
import type { MaybeRefOrGetter } from 'vue';
import { toValue } from 'vue';
import { translateIssues } from '../helpers';
import type { FieldTranslations } from '../types';

/**
 * Translate a list of validup `Issue`s to leaf-level localized messages.
 *
 * Accepts a `MaybeRefOrGetter` so the source can be a static array, a
 * `Ref<Issue[]>`, or a getter (e.g. `() => $v.fields.email.$issues.value`).
 * Returns a `Ref<IssueTranslation[]>` that re-runs whenever the source
 * changes or the injected locale flips.
 *
 * The injected `Ilingo` instance and locale `Ref` come from the
 * `@ilingo/vue` plugin — call `install(app, …)` from this package (or
 * `@ilingo/vue` directly) before reaching for this composable.
 */
export function useTranslationsForIssues(
    issues: MaybeRefOrGetter<Issue[]>,
): FieldTranslations {
    const instance = injectIlingo();
    const locale = injectLocale();

    return computedAsync(async () => {
        const source = toValue(issues);
        if (!source || source.length === 0) {
            return [];
        }
        return translateIssues(source, instance, { locale: locale.value });
    }, []);
}
