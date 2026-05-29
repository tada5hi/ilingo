/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { PropType, SlotsType, VNodeChild } from 'vue';
import {
    defineComponent,
    toRef,
} from 'vue';
import { SlotName } from '@ilingo/validup';
import type { SlotProps } from '@ilingo/validup';
import type { Issue } from 'validup';
import { useTranslationsForIssues } from './composables';

/**
 * Renderless / slot-aware component that translates the given validup
 * `Issue[]` through ilingo and exposes the result via the default slot.
 *
 * Without a slot, renders one text node per translated leaf — the
 * minimal "just show the messages" shape. With a slot, the consumer
 * receives the full `IssueTranslation[]` and can render whatever
 * structure they want (list, badges, …).
 *
 * @example
 *     <IValidup :issues="$v.fields.email.$issues.value">
 *         <template #default="{ translations }">
 *             <li v-for="t in translations" :key="t.issue.code">
 *                 {{ t.message }}
 *             </li>
 *         </template>
 *     </IValidup>
 */
const IValidup = defineComponent({
    props: {
        issues: {
            type: Array as PropType<Issue[]>,
            required: true,
        },
    },
    slots: Object as SlotsType<{
        [SlotName.DEFAULT]: SlotProps,
    }>,
    setup(props, { slots }) {
        const issues = toRef(props, 'issues');
        const translations = useTranslationsForIssues(issues);

        return () => {
            if (typeof slots[SlotName.DEFAULT] === 'undefined') {
                const output: VNodeChild = [];
                for (const t of translations.value) {
                    output.push(t.message);
                }
                return output;
            }

            return slots[SlotName.DEFAULT]({ translations: translations.value } satisfies SlotProps);
        };
    },
});

export {
    IValidup,
};
