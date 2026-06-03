/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { PropType, SlotsType, VNodeChild } from 'vue';
import { defineComponent, toRef } from 'vue';
import { SlotName } from '@ilingo/validup';
import type { FieldState } from '@validup/vue';
import type { FieldValidation } from './types';
import { useFieldValidation } from './composables';

/**
 * Renderless companion to {@link useFieldValidation} for **template-only**
 * use — when you want the bundle bound onto vuecs's `<VCFormGroup :validation>`
 * without declaring it in `setup()`.
 *
 * Because it is a component, the `useFieldValidation` call (and the
 * `computedAsync` watcher underneath it) runs in this component's own
 * `setup()` scope: created once, disposed automatically on unmount. That
 * is the leak-free alternative to calling `useFieldValidation` inline in a
 * template — a render-path call registers a fresh, never-disposed watcher
 * every render and hangs the page on typing (#965). Mirrors the
 * `<IValidup>` / `<IValidupT>` renderless pattern.
 *
 * The default scoped slot receives the reactive bundle as `value` (the
 * component name already says "validation", so the slot scope doesn't
 * repeat it):
 *
 * ```vue
 * <IFieldValidation :field="$v.fields.email" v-slot="{ value }">
 *     <VCFormGroup :validation="value">
 *         <VCFormInput v-model="$v.fields.email.$model" />
 *     </VCFormGroup>
 * </IFieldValidation>
 * ```
 *
 * Without a default slot the component renders nothing (the bundle is still
 * built, but there is no consumer for it).
 */
const IFieldValidation = defineComponent({
    props: {
        field: {
            type: Object as PropType<FieldState>,
            required: true,
        },
    },
    slots: Object as SlotsType<{
        [SlotName.DEFAULT]?: (props: { value: FieldValidation }) => VNodeChild,
    }>,
    setup(props, { slots }) {
        // `toRef` keeps the bundle reactive if the bound `field` changes
        // (e.g. a parent rebinds `:field` to a different FieldState).
        const value = useFieldValidation(toRef(props, 'field'));

        return () => {
            const slot = slots[SlotName.DEFAULT];
            return slot ? slot({ value }) : [];
        };
    },
});

export {
    IFieldValidation,
};
