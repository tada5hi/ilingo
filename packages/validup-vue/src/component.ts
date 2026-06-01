/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { PropType, SlotsType, VNodeChild } from 'vue';
import {
    defineComponent,
} from 'vue';
import { SlotName } from '@ilingo/validup';
import type { GroupSlotProps, SlotProps } from '@ilingo/validup';
import type { Composable } from '@validup/vue';
import type { Issue } from 'validup';
import { useTranslationsForIssues } from './composables';
import { useTranslatedGroups } from './composables/shared';

/**
 * Renderless / slot-aware component that translates validup issues
 * through ilingo. It has two mutually exclusive modes:
 *
 * **Leaf mode — `:issues="Issue[]"`** (the simple per-field case). The
 * default slot receives the translated `IssueTranslation[]`; without a
 * slot, renders one text node per leaf.
 *
 * ```vue
 * <IValidup :issues="$v.fields.email.$errors.value">
 *     <template #default="{ translations }">
 *         <li v-for="t in translations" :key="t.issue.code">{{ t.message }}</li>
 *     </template>
 * </IValidup>
 * ```
 *
 * **Composable mode — `:composable="$v"`** (whole-form). The full
 * `@validup/vue` `Composable<T>` is decomposed into the three error
 * channels it exposes, each surfaced via its own named slot:
 *
 * - `#cross-cutting` — path-less `$crossCuttingErrors` (CSRF, rate-limit,
 *   schema-level failures); rendered top-of-form.
 * - `#groups` — `$groupErrors` (e.g. `ONE_OF_FAILED`), translated by each
 *   group's own `code` — carries `GroupSlotProps`.
 * - `#fields` — the flattened leaf `$errors`.
 *
 * ```vue
 * <IValidup :composable="$v">
 *     <template #cross-cutting="{ translations }"> … </template>
 *     <template #groups="{ translations }"> … </template>
 *     <template #fields="{ translations }"> … </template>
 * </IValidup>
 * ```
 *
 * Each stream renders via its slot when provided, else falls back to
 * plain text — so with no slots at all the component renders all three
 * streams in order (cross-cutting, groups, fields).
 *
 * `:composable` wins when both props are passed; `:issues` is the leaf
 * shortcut.
 */
const IValidup = defineComponent({
    props: {
        issues: {
            type: Array as PropType<Issue[]>,
            default: undefined,
        },
        composable: {
            type: Object as PropType<Composable>,
            default: undefined,
        },
    },
    slots: Object as SlotsType<{
        [SlotName.DEFAULT]?: SlotProps,
        [SlotName.CROSS_CUTTING]?: SlotProps,
        [SlotName.GROUPS]?: GroupSlotProps,
        [SlotName.FIELDS]?: SlotProps,
    }>,
    setup(props, { slots }) {
        // All reactive sources are wired unconditionally (Vue setup runs
        // once); the getters return `[]` for whichever mode is inactive so
        // no stream does work it isn't rendering.
        const leafTranslations = useTranslationsForIssues(
            () => (props.composable ? [] : props.issues ?? []),
        );
        const fieldTranslations = useTranslationsForIssues(
            () => props.composable?.$errors.value ?? [],
        );
        const crossCuttingTranslations = useTranslationsForIssues(
            () => props.composable?.$crossCuttingErrors.value ?? [],
        );
        const groupTranslations = useTranslatedGroups(
            () => props.composable?.$groupErrors.value ?? [],
        );

        return () => {
            if (props.composable) {
                const output: VNodeChild[] = [];

                const cross = slots[SlotName.CROSS_CUTTING];
                if (cross) {
                    output.push(...cross({ translations: crossCuttingTranslations.value }));
                } else {
                    for (const t of crossCuttingTranslations.value) {
                        output.push(t.message);
                    }
                }

                const groups = slots[SlotName.GROUPS];
                if (groups) {
                    output.push(...groups({ translations: groupTranslations.value }));
                } else {
                    for (const t of groupTranslations.value) {
                        output.push(t.message);
                    }
                }

                const fields = slots[SlotName.FIELDS];
                if (fields) {
                    output.push(...fields({ translations: fieldTranslations.value }));
                } else {
                    for (const t of fieldTranslations.value) {
                        output.push(t.message);
                    }
                }

                return output;
            }

            // Leaf mode — :issues shortcut.
            const slot = slots[SlotName.DEFAULT];
            if (typeof slot === 'undefined') {
                const output: VNodeChild[] = [];
                for (const t of leafTranslations.value) {
                    output.push(t.message);
                }
                return output;
            }

            return slot({ translations: leafTranslations.value } satisfies SlotProps);
        };
    },
});

export {
    IValidup,
};
