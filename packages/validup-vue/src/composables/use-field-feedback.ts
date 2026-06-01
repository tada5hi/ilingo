/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { FieldState } from '@validup/vue';
import { getSeverity } from '@validup/vue';
import type { MaybeRef } from 'vue';
import { computed, reactive, unref } from 'vue';
import type { FieldFeedback } from '../types';
import { useTranslationsForField } from './use-translations-for-field';

/**
 * Bundle a field's presentational **severity** and its **translated
 * messages** into the single shape a `<VCFormGroup>`-style host consumes
 * — so a per-field feedback block collapses from three reactive shims
 * (severity, translations, reshape) to one `v-bind`.
 *
 * ```vue
 * <VCFormGroup v-bind="useFieldFeedback($v.fields.email)">
 *     <VCFormInput v-model="$v.fields.email.$model" />
 * </VCFormGroup>
 * ```
 *
 * `v-bind`-ing the return value works because it is a **`reactive`**
 * bundle — its `severity` and `messages` keys auto-unwrap (and stay
 * reactive) when spread onto the host's `validation-severity` /
 * `validation-messages` props. The reshape `{ code, message }` →
 * `{ key, value }` lives here so it stays in sync with whatever the UI
 * host accepts; the `issues` escape hatch exposes the original
 * `IssueTranslation[]` for richer rendering.
 *
 * - `severity` — `getSeverity(field)` from `@validup/vue` (dirty/pending/
 *   optional aware); `undefined` while the field is pristine.
 * - `messages` — `{ key: issue.code ?? 'validation', value: message }[]`,
 *   reactive to the translated `$errors` and the injected locale.
 * - `issues` — the original `IssueTranslation[]` (from
 *   `useTranslationsForField`), for consumers that opt out of the reshape.
 *
 * The injected `Ilingo` instance + locale `Ref` come from the
 * `@ilingo/vue` plugin — call its `install()` (and this package's) first.
 */
export function useFieldFeedback<V = unknown>(
    field: MaybeRef<FieldState<V>>,
): FieldFeedback {
    const issues = useTranslationsForField(field);

    const severity = computed(() => getSeverity(unref(field)));
    const messages = computed(() => issues.value.map((t) => ({
        key: t.issue.code ?? 'validation',
        value: t.message,
    })));

    // A `reactive` bundle (not a bag of refs) so `v-bind="useFieldFeedback(…)"`
    // spreads unwrapped, reactive values onto the host component. `reactive`'s
    // `UnwrapNestedRefs` collapses the computed/refs to `FieldFeedback`'s
    // plain shape, so no cast is needed.
    return reactive({
        severity,
        messages,
        issues,
    });
}
