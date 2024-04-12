<script lang="ts">
import type { DotKey } from 'ilingo';
import { parseKey } from 'ilingo';
import type { PropType } from 'vue';
import {
    defineComponent,
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
        const [group, key] = parseKey(props.path);
        const text = useTranslation(group, key, props.data);

        return {
            text,
        };
    },
});
</script>
<template>
    {{ text }}
</template>
