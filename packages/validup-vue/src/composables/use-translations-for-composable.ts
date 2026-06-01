/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Composable } from '@validup/vue';
import type { ObjectLiteral } from 'validup';
import type { MaybeRef } from 'vue';
import { computed, unref } from 'vue';
import type { FieldTranslations } from '../types';
import { useTranslationsForIssues } from './use-translations-for-issues';

/**
 * Translate the form-level `$errors` of a `@validup/vue` `Composable<T>`.
 *
 * Equivalent to `useTranslationsForIssues(() => $v.$errors.value)` —
 * sugar for the common "render all dirty-gated field errors" pattern.
 *
 * For per-field translations, prefer `useTranslationsForField($v.fields.name)`
 * so the output stays scoped to that field.
 */
export function useTranslationsForComposable<T extends ObjectLiteral = ObjectLiteral>(
    composable: MaybeRef<Composable<T>>,
): FieldTranslations {
    return useTranslationsForIssues(
        computed(() => unref(composable).$errors.value),
    );
}
