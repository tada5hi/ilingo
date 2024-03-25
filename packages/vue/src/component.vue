<script lang="ts">
import type { DotKey } from 'ilingo';
import type { PropType } from 'vue';
import {
    defineComponent
} from 'vue';
import { useTranslation } from './composables';

export default defineComponent({
    props: {
        path: {
            type: String as PropType<DotKey>,
            required: true,
        },
        data: {
            type: Object as PropType<Record<string, any>>,
        },
    },
    setup(props) {
        const text = useTranslation(props.path, props.data);

        return {
            text
        };
    },
});
</script>
<template>
    {{ text }}
</template>
