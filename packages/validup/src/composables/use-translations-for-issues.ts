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
import { shallowRef, toValue } from 'vue';
import { translateIssues } from '../helpers';
import type { FieldTranslations, IssueTranslation } from '../types';

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
 *
 * **Flicker-free locale switching:** on a re-run (locale flip, new
 * issues) the previously-resolved translations stay visible until the
 * next batch resolves. Without this, every async re-evaluation would
 * blank the UI back to the initial `[]` for one tick — visible as an
 * error-message blink during a locale switch on a form that already
 * has errors on screen. A dedicated `lastResolved` ref holds the
 * previous batch and feeds it back as `computedAsync`'s initial state.
 */
export function useTranslationsForIssues(
    issues: MaybeRefOrGetter<Issue[]>,
): FieldTranslations {
    const instance = injectIlingo();
    const locale = injectLocale();

    // `translateIssues` returns a discriminated union shaped by the
    // literal `IssueCode`s; the holding ref widens that to the public
    // `IssueTranslation` alias. `shallowRef` keeps Vue's deep-unwrap
    // off (which otherwise tries to narrow the element shape) so the
    // ref / callback / initial-state triple share one nominal type.
    const lastResolved = shallowRef<IssueTranslation[]>([]);

    return computedAsync<IssueTranslation[]>(async () => {
        const source = toValue(issues);
        if (!source || source.length === 0) {
            lastResolved.value = [];
            return [];
        }
        const next = await translateIssues(source, instance, { locale: locale.value }) as IssueTranslation[];
        lastResolved.value = next;
        return next;
    }, lastResolved.value);
}
