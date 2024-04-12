<script lang="ts">
import type { BaseValidation } from '@vuelidate/core';
import type { PropType } from 'vue';
import {
    defineComponent,
    toRef,
} from 'vue';
import { useValidationMessages } from './use-validation-messages';

export default defineComponent({
    props: {
        validation: {
            type: Object as PropType<BaseValidation>,
            required: true,
        },
    },
    setup(props) {
        const validation = toRef(props, 'validation');
        const messages = useValidationMessages((validation as Record<string, any>).value);

        return {
            messages,
        };
    },
});
</script>
<template>
    <template
        v-for="(value, key) in messages"
        :key="key"
    >
        {{ value }}
    </template>
</template>
