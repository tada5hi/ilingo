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
 * Memoize each built bundle against the identity of the `field` argument.
 *
 * The bundle wires a `computedAsync` (via `useTranslationsForField` →
 * `useTranslationsForIssues`), and `computedAsync` registers a
 * `watchEffect` in the **active effect scope** at call time. When this
 * composable is called *inline in a template* — the documented
 * `<VCFormGroup :validation="useFieldValidation($v.fields.email)">`
 * pattern — that scope is the enclosing component's render scope, which
 * Vue does not auto-dispose between renders. Each keystroke would
 * register a fresh watcher, accumulating an unbounded list that re-fires
 * every render and saturates the scheduler (the page hangs on the second
 * keystroke). See https://github.com/tada5hi/ilingo/issues/965.
 *
 * `@validup/vue`'s `useValidup` hands out a **stable** `FieldState` per
 * `(form, path)` — its internal `fieldsCache` returns the same object for
 * repeated `$v.fields.email` accesses across renders — so the field is a
 * sound `WeakMap` key. The first call through a given field registers the
 * watcher once (it lives for the component's lifetime, exactly like a
 * `setup()`-level composable call); every later render returns the cached
 * bundle and registers nothing.
 *
 * Cross-component pollution can't happen: two `useValidup()` instances
 * mint distinct `FieldState` identities even for the same path. A `Ref`
 * source keys by the ref's own identity (also stable), and the cached
 * bundle stays reactive to whichever field the ref currently points at.
 */
const bundleCache = new WeakMap<object, FieldValidation>();

/**
 * Bundle a field's presentational **severity** and its **translated
 * messages** into the single shape vuecs's `<VCFormGroup :validation>`
 * prop consumes — so a per-field validation block collapses from three
 * reactive shims (severity, translations, reshape) to one binding.
 *
 * ```vue
 * <VCFormGroup :validation="useFieldValidation($v.fields.email)">
 *     <VCFormInput v-model="$v.fields.email.$model" />
 * </VCFormGroup>
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
 * The bundle is **memoized per `field` identity** so it is safe to call
 * inline in a template (as the example above does) — the underlying async
 * watcher is registered once per field, not once per render. See
 * {@link bundleCache} for the why.
 *
 * The injected `Ilingo` instance + locale `Ref` come from the
 * `@ilingo/vue` plugin — call its `install()` (and this package's) first.
 */
export function useFieldValidation<V = unknown>(
    field: MaybeRef<FieldState<V>>,
): FieldValidation {
    const cached = bundleCache.get(field);
    if (cached) {
        return cached;
    }

    const issues = useTranslationsForField(field);

    const severity = computed(() => getSeverity(unref(field)));
    const messages = computed(() => issues.value.map((t) => ({
        key: t.issue.code ?? 'validation',
        value: t.message,
    })));

    // A `reactive` bundle (not a bag of refs) so `:validation="useFieldValidation(…)"`
    // binds unwrapped, reactive values onto the host component. `reactive`'s
    // `UnwrapNestedRefs` collapses the computed/refs to `FieldValidation`'s
    // plain shape, so no cast is needed.
    const bundle = reactive({
        severity,
        messages,
        issues,
    });

    bundleCache.set(field, bundle);
    return bundle;
}
