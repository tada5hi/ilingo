<script lang="ts">
import type { BaseValidation } from '@vuelidate/core';
import type { PropType } from 'vue';
import {
    defineComponent,
    toRef,
} from 'vue';
import { useTranslationsForBaseValidation } from './use-translations-for-base-validation';

export default defineComponent({
    props: {
        validation: {
            type: Object as PropType<BaseValidation>,
            required: true,
        },
    },
    setup(props) {
        const validation = toRef(props, 'validation');
        const messages = useTranslationsForBaseValidation((validation as Record<string, any>).value);

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
