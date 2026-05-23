/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { computedAsync } from '@vueuse/core';
import { tokenize } from 'ilingo';
import type { PropType, VNodeChild } from 'vue';
import {
    computed,
    defineComponent,
    h,
    unref,
} from 'vue';
import { injectIlingo } from './composables/instance';
import { injectLocale } from './composables/locale';
import { extractReactiveData } from './composables/utils';
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
        count: { type: Number },
        tag: { type: String, default: 'span' },
    },
    setup(props, { slots }) {
        const instance = injectIlingo();
        const localeRef = injectLocale();

        // Reactive to `props.path` — re-parses if the parent flips the path
        // mid-flight. Throws on a path without a dot, matching <ITranslate>.
        // Eagerly validated at setup so a malformed initial path fails on
        // mount rather than asynchronously on first render.
        parsePath(props.path);
        const parsed = computed(() => parsePath(props.path));

        const text = computedAsync(
            async () => {
                const { group, key } = parsed.value;
                const value = await instance.get({
                    group,
                    key,
                    data: props.data ? extractReactiveData(props.data) : undefined,
                    locale: props.locale ?? localeRef.value,
                    count: props.count,
                });
                return value ?? `${group}.${key}`;
            },
            '',
        );

        const tokens = computed(() => tokenize(text.value));

        return () => {
            const children: VNodeChild[] = [];
            for (const token of tokens.value) {
                if (token.kind === 'text') {
                    children.push(token.value);
                } else if (token.kind === 'var') {
                    // `{{var}}` placeholders are normally substituted by
                    // Ilingo.format() before tokenize sees the message; this
                    // branch handles the leftover case where data was missing
                    // a key, so the placeholder survived. Re-check
                    // props.data in case the value is a Ref that wasn't
                    // unwrapped by extractReactiveData (defensive).
                    const raw = props.data?.[token.name];
                    if (typeof raw === 'undefined') {
                        // Preserve the FULL original placeholder, including any
                        // modifier expression — dropping it would silently
                        // mutate the literal text shown when data is missing.
                        children.push(token.modifierExpression ?
                            `{{${token.name}, ${token.modifierExpression}}}` :
                            `{{${token.name}}}`);
                    } else {
                        children.push(String(unref(raw)));
                    }
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
    // Reject missing dot, leading dot (empty group), and trailing dot (empty key).
    if (index <= 0 || index >= path.length - 1) {
        throw new SyntaxError(
            `[ilingo] <ITranslateT path="${path}"> requires a "group.key" path.`,
        );
    }
    return { group: path.slice(0, index), key: path.slice(index + 1) };
}
