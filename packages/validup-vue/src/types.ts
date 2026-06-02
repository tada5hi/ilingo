/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IssueGroupTranslation, IssueTranslation, KeyValue } from '@ilingo/validup';
import type { Ref } from 'vue';
import type { Severity } from '@validup/vue';

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

/**
 * Reactive list of translated **group** issues. Produced by
 * `useTranslationsForGroupErrors`; rebuilds when the composable's
 * `$groupErrors` change or when the injected locale flips.
 *
 * The group-level counterpart to {@link FieldTranslations} — see
 * `IssueGroupTranslation` for why the two are distinct.
 */
export type GroupTranslations = Ref<IssueGroupTranslation[]>;

/**
 * Return shape of `useFieldValidation` — a **`reactive`** bundle of the
 * field's `severity`, its reshaped `messages`, and the raw `issues`
 * escape hatch. Structurally what vuecs's `<VCFormGroup :validation>`
 * prop consumes, so the bundle binds straight onto it:
 * `<VCFormGroup :validation="useFieldValidation($v.fields.email)">`.
 *
 * The name mirrors vuecs's `validation-*` vocabulary (`validation-severity`
 * / `validation-messages`, `<VCValidationGroup>`); compatibility is
 * structural — vuecs declares its own identical type rather than importing
 * this one.
 */
export type FieldValidation = {
    severity: Severity;
    messages: KeyValue<string>[];
    issues: IssueTranslation[];
};
