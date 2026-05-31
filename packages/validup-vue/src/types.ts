/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IssueTranslation } from '@ilingo/validup';
import type { Ref } from 'vue';

/**
 * Reactive list of translated leaf issues. Produced by
 * `useTranslationsForIssues` and `useTranslationsForField`; rebuilds
 * automatically when the source `issues` change or when the injected
 * locale flips.
 *
 * Lives in `@ilingo/validup-vue` because it carries a `Ref<...>` that
 * pulls Vue into the type graph; the underlying `IssueTranslation`
 * shape is framework-agnostic and is exported from `@ilingo/validup`.
 */
export type FieldTranslations = Ref<IssueTranslation[]>;
