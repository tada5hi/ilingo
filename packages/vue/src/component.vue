<script lang="ts">
import type { DotKey } from 'ilingo';
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
        const parseKey = (key: string) : [string, string] => {
            const index = key.indexOf('.');
            if (index === -1) {
                throw new SyntaxError('The key with required group prefix could not be parsed.');
            }

            const group = key.substring(0, index);
            const line = key.substring(group.length + 1);

            return [group, line];
        };

        const [group, key] = parseKey(props.path);
        const text = useTranslation({ group, key, data: props.data });

        return {
            text,
        };
    },
});
</script>
<template>
    {{ text }}
</template>
