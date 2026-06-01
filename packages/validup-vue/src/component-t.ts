/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { PropType, SlotsType, VNodeChild } from 'vue';
import {
    defineComponent,
    h,
    toRef,
} from 'vue';
import { ITranslateT } from '@ilingo/vue';
import { NAMESPACE, coerceIssueData } from '@ilingo/validup';
import type { IssueSlotProps } from '@ilingo/validup';
import type { Issue } from 'validup';
import { useTranslationsForIssues } from './composables';

/**
 * Slot-aware sibling of `<IValidup>` — wires validup issues into
 * `@ilingo/vue`'s `<ITranslateT>` so a validation message can carry Vue
 * components / slot content (a `<router-link>` to the referenced field, a
 * sign-in `<button>`, a help `<VCPopover>`) inline, not just text.
 *
 * **No placeholder slots → text path.** With no slots the component
 * behaves exactly like `<IValidup :issues>`: it renders translated text
 * via `useTranslationsForIssues` (so the `issue.message` fallback for
 * un-cataloged codes is preserved) and pays none of the `<ITranslateT>`
 * cost. This is the common case — every built-in message is plain text.
 *
 * **Placeholder slots → component path.** When the consumer provides
 * named slots, each issue is rendered through an
 * `<ITranslateT path="validup.<code>" :data="issue.data">` and every named
 * slot is forwarded as the corresponding `{slot}` filler. Each forwarded
 * slot receives a `{ issue, code }` scope ({@link IssueSlotProps}), so the
 * same placeholder name can render different content per issue (branch on
 * `code`). An issue without a usable `code` falls back to its raw
 * `message`.
 *
 * ```vue
 * <IValidupT :issues="$v.fields.password.$errors.value">
 *     <template #passwordField="{ issue }">
 *         <router-link :to="`#${issue.data.other}`">{{ issue.data.other }}</router-link>
 *     </template>
 * </IValidupT>
 * ```
 *
 * Per-issue element tag follows `<ITranslateT>`'s `tag` prop (default
 * `span`; `tag=""` renders a fragment).
 */
const IValidupT = defineComponent({
    props: {
        issues: {
            type: Array as PropType<Issue[]>,
            required: true,
        },
        locale: {
            type: String,
            default: undefined,
        },
        tag: {
            type: String,
            default: 'span',
        },
    },
    slots: Object as SlotsType<Record<string, (props: IssueSlotProps) => VNodeChild>>,
    setup(props, { slots }) {
        const issues = toRef(props, 'issues');
        // Used only on the no-slots text path; cheap to keep wired (Vue
        // setup runs once) so the render fn can branch per-render.
        const textTranslations = useTranslationsForIssues(issues);

        return () => {
            const slotNames = Object.keys(slots);

            // No placeholder slots → behave like <IValidup> leaf text.
            if (slotNames.length === 0) {
                const output: VNodeChild[] = [];
                for (const t of textTranslations.value) {
                    output.push(t.message);
                }
                return output;
            }

            // Slots present → per-issue <ITranslateT> with forwarded scoped slots.
            const output: VNodeChild[] = [];
            props.issues.forEach((issue, index) => {
                const { code } = issue;
                if (typeof code !== 'string' || code.length === 0) {
                    // No code → can't key a catalog entry; render the raw message.
                    output.push(props.tag ? h(props.tag, issue.message) : issue.message);
                    return;
                }

                // Forward each consumer slot, injecting the { issue, code } scope.
                const forwarded: Record<string, () => VNodeChild> = {};
                for (const name of slotNames) {
                    const slotFn = slots[name]!;
                    forwarded[name] = () => slotFn({ issue, code });
                }

                output.push(h(
                    ITranslateT,
                    {
                        key: `${code}-${index}`,
                        path: `${NAMESPACE}.${code}`,
                        data: coerceIssueData(issue.data),
                        locale: props.locale,
                        tag: props.tag,
                    },
                    forwarded,
                ));
            });
            return output;
        };
    },
});

export {
    IValidupT,
};
