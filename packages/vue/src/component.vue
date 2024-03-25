<script lang="ts">
import type { DotKey } from 'ilingo';
import type { PropType } from 'vue';
import {
    defineComponent, h, ref, watch,
} from 'vue';
import { injectLocale } from './locale';
import { injectIlingo } from './module';

export default defineComponent({
    props: {
        dotKey: {
            type: String as PropType<DotKey>,
            required: true,
        },
        data: {
            type: Object as PropType<Record<string, any>>,
        },
    },
    setup(props) {
        const translator = injectIlingo();
        const locale = injectLocale();

        const text = ref('');

        const translate = () => {
            const value = translator.getSync(props.dotKey, props.data, locale.value);
            if (value) {
                text.value = value;
                return;
            }

            text.value = props.dotKey;
        };

        translate();

        watch(locale, (val, oldValue) => {
            if(val !== oldValue) {
                translate();
            }
        });

        return {
            text
        };
    },
});
</script>
<template>
    {{ text }}
</template>
