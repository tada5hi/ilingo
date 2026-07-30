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
import { translateIssues, translateIssuesSync } from '@ilingo/validup';
import type { IssueTranslation } from '@ilingo/validup';
import type { FieldTranslations } from '../types';
import { trySeed } from './seed';

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
 * `localeOverride` pins the lookup to a specific locale instead of the
 * injected one — pass a `MaybeRefOrGetter` so a reactive source (e.g. a
 * component's `locale` prop) still re-runs on change. A nullish value
 * (the default) falls back to the injected locale.
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
    localeOverride?: MaybeRefOrGetter<string | undefined>,
): FieldTranslations {
    const instance = injectIlingo();
    const locale = injectLocale();

    // `translateIssues` returns a discriminated union shaped by the
    // literal `IssueCode`s; the holding ref widens that to the public
    // `IssueTranslation` alias. `shallowRef` keeps Vue's deep-unwrap
    // off (which otherwise tries to narrow the element shape) so the
    // ref / callback / initial-state triple share one nominal type.
    const lastResolved = shallowRef<IssueTranslation[]>([]);

    // Synchronous seed: when the catalog can answer without I/O (the bundled
    // memory store, the common case) the first render already carries the
    // localized messages instead of an empty list — no blink on mount, and
    // server-rendered markup that the client reproduces exactly (#988).
    // `translateIssuesSync` is all-or-nothing and returns undefined when it
    // cannot guarantee the async result, so a partial batch never leaks in.
    //
    // Guarded: this runs on the synchronous setup path, so anything that
    // throws here (a malformed issue shape — validup's `flattenIssueItems`
    // rejects an item without a `code` — a throwing custom store) would break
    // the mount, where the same throw inside the `computedAsync` below is
    // absorbed by its `onError`. Seeding is an optimization; it must never be
    // able to make things worse than not seeding.
    const seed = trySeed(() => translateIssuesSync(
        toValue(issues) ?? [],
        instance,
        { locale: toValue(localeOverride) ?? locale.value },
    ) as IssueTranslation[] | undefined);
    if (seed) {
        lastResolved.value = seed;
    }

    return computedAsync<IssueTranslation[]>(async () => {
        const source = toValue(issues);
        if (!source || source.length === 0) {
            lastResolved.value = [];
            return [];
        }
        // Read both deps unconditionally so the computed re-runs on either
        // an override change or an injected-locale flip.
        const effectiveLocale = toValue(localeOverride) ?? locale.value;
        const next = await translateIssues(source, instance, { locale: effectiveLocale }) as IssueTranslation[];
        lastResolved.value = next;
        return next;
    }, lastResolved.value);
}
