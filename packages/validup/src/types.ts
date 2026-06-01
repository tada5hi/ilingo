/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Issue, IssueGroup, IssueItem } from 'validup';

/**
 * A single translated leaf issue — the original `IssueItem` plus the
 * localized `message` resolved via the active `Ilingo` instance.
 */
export type IssueTranslation = {
    issue: IssueItem;
    message: string;
};

/**
 * A single translated group issue — the original `IssueGroup` plus the
 * localized `message` resolved via the active `Ilingo` instance.
 *
 * Distinct from {@link IssueTranslation} because an `IssueGroup` is
 * translated by *its own* `code` (e.g. `one_of_failed`) without
 * descending into its children — group-level rendering wants the
 * "the form's shape is wrong" message, not the per-branch leaves.
 * Produced by `translateIssueGroups`.
 */
export type IssueGroupTranslation = {
    issue: IssueGroup;
    message: string;
};

export type KeyValue<T = unknown> = {
    key: string,
    value: T,
};

export type SlotProps = {
    translations: IssueTranslation[];
};

/**
 * Slot payload for the `#groups` channel of `<IValidup :composable>` —
 * carries group-level translations (translated by each group's own
 * `code`), as opposed to the leaf {@link SlotProps}.
 */
export type GroupSlotProps = {
    translations: IssueGroupTranslation[];
};

/**
 * Per-issue scope handed to every placeholder slot of `<IValidupT>` (the
 * slot-aware sibling of `<IValidup>`). The consumer's named slots receive
 * `{ issue, code }` so the same placeholder name can render different
 * content per issue — e.g. branch on `code` to vary a link target.
 */
export type IssueSlotProps = {
    issue: Issue;
    code: string;
};
