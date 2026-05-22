/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { tokenize } from 'ilingo';
import type { PropType, VNodeChild } from 'vue';
import { 
    computed, 
    defineComponent, 
    h, 
    unref, 
} from 'vue';
import { useTranslation } from './composables';
import type { DataMaybeRef } from './types';

/**
 * `<ITranslateT>` — slot-aware translation component.
 *
 * The message can contain `{slot}` placeholders alongside the usual
 * `{{var}}` interpolations. Slots are filled by named scoped slots on the
 * component, so consumers can drop arbitrary VNodes (links, icons, bold
 * runs, …) inline without splitting the message across multiple keys.
 *
 * ```vue
 * <ITranslateT path="app.welcome" :data="{ user: 'Peter' }">
 *     <template #cta>
 *         <a href="/start">get started</a>
 *     </template>
 * </ITranslateT>
 * ```
 *
 * With `app.welcome = "Hi {{user}}, click {cta} to continue."`, the
 * rendered output is `<span>Hi Peter, click <a href="/start">get started</a> to continue.</span>`.
 *
 * Element tag is `<span>` by default. Override via the `tag` prop
 * (e.g. `tag="p"`); pass `tag=""` to render a fragment with no wrapper.
 */
export const ITranslateT = defineComponent({
    name: 'ITranslateT',
    props: {
        path: { type: String, required: true },
        data: { type: Object as PropType<DataMaybeRef> },
        locale: { type: String },
        count: { type: [Number, Object] as PropType<number | { value: number }> },
        tag: { type: String, default: 'span' },
    },
    setup(props, { slots }) {
        const { group, key } = parsePath(props.path);

        const text = useTranslation({
            group,
            key,
            data: props.data,
            locale: props.locale,
            count: props.count as never,
        });

        const tokens = computed(() => tokenize(text.value));

        return () => {
            const children: VNodeChild[] = [];
            for (const token of tokens.value) {
                if (token.kind === 'text') {
                    children.push(token.value);
                } else if (token.kind === 'var') {
                    const raw = props.data?.[token.name];
                    children.push(
                        typeof raw === 'undefined' ? `{{${token.name}}}` : String(unref(raw)),
                    );
                } else {
                    const slotFn = slots[token.name];
                    if (slotFn) {
                        // Spread the slot's VNodes inline.
                        for (const node of slotFn()) {
                            children.push(node);
                        }
                    } else {
                        children.push(`{${token.name}}`);
                    }
                }
            }
            if (!props.tag) {
                // `tag=""` renders the children without a wrapper element.
                return children;
            }
            return h(props.tag, children);
        };
    },
});

function parsePath(path: string): { group: string, key: string } {
    const index = path.indexOf('.');
    if (index === -1) {
        throw new SyntaxError(
            `[ilingo] <ITranslateT path="${path}"> requires a "group.key" path.`,
        );
    }
    return {
        group: path.slice(0, index),
        key: path.slice(index + 1),
    };
}
