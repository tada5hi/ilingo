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
import type { FieldValidation } from '../types';
import { useTranslationsForField } from './use-translations-for-field';

/**
 * Bundle a field's presentational **severity** and its **translated
 * messages** into the single shape vuecs's `<VCFormGroup :validation>`
 * prop consumes — so a per-field validation block collapses from three
 * reactive shims (severity, translations, reshape) to one binding.
 *
 * **Call this in `setup()`, not in the template.** Like every composable
 * here it wires a `computedAsync` (via `useTranslationsForField`), whose
 * watcher is owned by the effect scope active at call time. From `setup()`
 * that is the component scope — created once, disposed on unmount. Called
 * *inline in the template* it would register a fresh, never-disposed
 * watcher on every render and hang the page on typing (#965), because the
 * render path has no active effect scope. For the template-only ergonomic
 * (no `setup()` line) use the renderless {@link IFieldValidation} component,
 * which owns the lifecycle for you.
 *
 * ```vue
 * <script setup lang="ts">
 * const validation = useFieldValidation($v.fields.email);
 * </script>
 *
 * <template>
 *     <VCFormGroup :validation="validation">
 *         <VCFormInput v-model="$v.fields.email.$model" />
 *     </VCFormGroup>
 * </template>
 * ```
 *
 * Binding the return value works because it is a **`reactive`** bundle —
 * its `severity` and `messages` keys auto-unwrap (and stay reactive) when
 * bound onto the host. The reshape `{ code, message }` → `{ key, value }`
 * lives here so it stays in sync with whatever the UI host accepts; the
 * `issues` escape hatch exposes the original `IssueTranslation[]` for
 * richer rendering.
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
export function useFieldValidation<V = unknown>(
    field: MaybeRef<FieldState<V>>,
): FieldValidation {
    const issues = useTranslationsForField(field);

    const severity = computed(() => getSeverity(unref(field)));
    const messages = computed(() => issues.value.map((t) => ({
        key: t.issue.code ?? 'validation',
        value: t.message,
    })));

    // A `reactive` bundle (not a bag of refs) so `:validation="validation"`
    // binds unwrapped, reactive values onto the host component. `reactive`'s
    // `UnwrapNestedRefs` collapses the computed/refs to `FieldValidation`'s
    // plain shape, so no cast is needed.
    return reactive({
        severity,
        messages,
        issues,
    });
}
