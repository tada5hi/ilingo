/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IssueItem } from 'validup';
import type { Ref } from 'vue';

/**
 * A single translated leaf issue — the original `IssueItem` plus the
 * localized `message` resolved via the active `Ilingo` instance.
 */
export interface IssueTranslation {
    issue: IssueItem;
    message: string;
}

/**
 * Reactive list of translated leaf issues. Produced by
 * `useTranslationsForIssues` and `useTranslationsForField`; rebuilds
 * automatically when the source `issues` change or when the injected
 * locale flips.
 */
export type FieldTranslations = Ref<IssueTranslation[]>;

export type KeyValue<T = unknown> = {
    key: string,
    value: T,
};

export type SlotProps = {
    translations: IssueTranslation[];
};
