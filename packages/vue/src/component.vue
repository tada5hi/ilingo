<script lang="ts">
import type { DotKey } from 'ilingo';
import type { PropType } from 'vue';
import {
    defineComponent,
} from 'vue';
import { useTranslation } from './composables';
import type { DataMaybeRef } from './types';

export default defineComponent({
    props: {
        path: {
            type: String as PropType<DotKey>,
            required: true,
        },
        data: { type: Object as PropType<DataMaybeRef> },
    },
    setup(props) {
        const parseKey = (key: string) : [string, string] => {
            const index = key.indexOf('.');
            if (index === -1) {
                throw new SyntaxError('The key with required namespace prefix could not be parsed.');
            }

            const namespace = key.substring(0, index);
            const line = key.substring(namespace.length + 1);

            return [namespace, line];
        };

        const [namespace, key] = parseKey(props.path);

        const text = useTranslation({
            namespace,
            key,
            data: props.data,
        });

        return { text };
    },
});
</script>
<template>
    {{ text }}
</template>
