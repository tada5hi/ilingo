/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Issue, IssueGroup, IssueItem } from 'validup';

/**
 * Type-level shape of the `'validup'` namespace inside an `Ilingo<Catalog>`.
 * Consumers compose this into their own catalog so `ilingo.get({ namespace:
 * 'validup', key: ... })` becomes type-checked end-to-end:
 *
 * ```ts
 * import type { ValidupCatalog } from '@ilingo/validup';
 *
 * type AppCatalog = {
 *     en: { app: { greeting: string } } & ValidupCatalog['en'];
 *     de: { app: { greeting: string } } & ValidupCatalog['de'];
 * };
 *
 * const ilingo = new Ilingo<AppCatalog>({ ... });
 * ```
 *
 * The interface is intentionally **augmentable**. Adapter authors and
 * consumers that register extension `IssueCode`s via validup's
 * `IssueDataByCode` declaration merging can also extend
 * `ValidupCatalog['en']['validup']` (and the other locales they ship)
 * here, so the type-checker enforces that every registered code has a
 * translation entry.
 *
 * Runtime shape comes from `./translations/{en,de,fr,es}.ts` — keep
 * the two in sync. The namespace name (`'validup'`) is the `NAMESPACE`
 * constant in `./constants.ts`.
 */
export interface ValidupCatalogEntries {
    value_invalid: string;
    one_of_failed: string;
    required: string;
    alpha: string;
    alpha_num: string;
    numeric: string;
    integer: string;
    decimal: string;
    min_length: string;
    max_length: string;
    min_value: string;
    max_value: string;
    between: string;
    email: string;
    url: string;
    ip_address: string;
    mac_address: string;
    uuid: string;
    date: string;
    pattern: string;
    json: string;
    base64: string;
    strong_password: string;
    same_as: string;
}

/**
 * Locale-keyed catalog shape backing `@ilingo/validup`'s default `Store`.
 * Built-in entries cover EN / DE / FR / ES; extend with declaration
 * merging if you ship additional locales:
 *
 * ```ts
 * declare module '@ilingo/validup' {
 *     interface ValidupCatalog {
 *         it: { validup: ValidupCatalogEntries };
 *     }
 * }
 * ```
 */
export interface ValidupCatalog {
    en: { validup: ValidupCatalogEntries };
    de: { validup: ValidupCatalogEntries };
    fr: { validup: ValidupCatalogEntries };
    es: { validup: ValidupCatalogEntries };
}

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
