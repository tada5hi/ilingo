/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { BaseValidation } from '@vuelidate/core';
import type { PropType, SlotsType, VNodeChild } from 'vue';
import {
    computed,
    defineComponent,
    h,
    toRef,
} from 'vue';
import { useSeverity, useTranslationsForBaseValidation } from './composables';
import { SlotName } from './constants';
import type { KeyValue, SlotProps } from './types';

const IVuelidate = defineComponent({
    slots: Object as SlotsType<{
        [SlotName.DEFAULT]: SlotProps
    }>,
    props: {
        validation: {
            type: Object as PropType<BaseValidation>,
            required: true,
        },
    },
    setup(props, { slots }) {
        const validation = toRef(props, 'validation');
        const translations = useTranslationsForBaseValidation((validation as Record<string, any>).value);

        const keyValuePairs = computed<KeyValue<string>[]>(() => {
            const output : KeyValue<string>[] = [];
            const keys = Object.keys(translations.value);

            for (let i = 0; i < keys.length; i++) {
                output.push({
                    key: keys[i],
                    value: translations.value[keys[i]],
                });
            }

            return output;
        });

        const severity = useSeverity(validation);

        return () => {
            if (typeof slots[SlotName.DEFAULT] === 'undefined') {
                const output : VNodeChild = [];
                for (let i = 0; i < keyValuePairs.value.length; i++) {
                    output.push(keyValuePairs.value[i].value);
                }

                return output;
            }

            return slots[SlotName.DEFAULT]({
                data: keyValuePairs.value,
                severity: severity.value,
            } satisfies SlotProps);
        };
    },
});

export {
    IVuelidate,
};
