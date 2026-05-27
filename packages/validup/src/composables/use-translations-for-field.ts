/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { FieldState } from '@validup/vue';
import type { MaybeRef } from 'vue';
import { computed, unref } from 'vue';
import type { FieldTranslations } from '../types';
import { useTranslationsForIssues } from './use-translations-for-issues';

/**
 * Translate the visible errors of a `@validup/vue` `FieldState` to
 * localized messages.
 *
 * Reads `fieldState.$errors` (which is already dirty-gated by
 * `@validup/vue`) so the returned `Ref<IssueTranslation[]>` only carries
 * entries the user should see. For the raw (non-dirty-gated) shape,
 * compose `useTranslationsForIssues(() => fieldState.$issues.value)`
 * directly.
 *
 * Accepts a `MaybeRef` to support both stable bindings (`fields.name`)
 * and reactive ones (a `computed` that selects a different field over
 * time).
 */
export function useTranslationsForField<V = unknown>(
    fieldState: MaybeRef<FieldState<V>>,
): FieldTranslations {
    return useTranslationsForIssues(
        computed(() => unref(fieldState).$errors.value),
    );
}
