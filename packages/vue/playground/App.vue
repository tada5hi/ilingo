<script>
import { defineComponent, ref } from 'vue';
import { ITranslate, injectLocale, useTranslation } from '../src';

export default defineComponent({
    components: {
        ITranslate,
    },
    setup() {
        const locale = injectLocale();

        const toggle = () => {
            locale.value = locale.value === 'de' ?
                'en' :
                'de';
        };

        const name = ref('Paul');
        setTimeout(() => {
            name.value = 'Patrick';
        }, 3000);

        const translation = useTranslation({
            group: 'app',
            key: 'key',
            data: {
                name,
            },
        });

        return {
            toggle,
            translation,
        };
    },
});
</script>
<template>
    <div>
        <ITranslate
            path="app.key"
            :data="{'name': 'Peter'}"
        />
    </div>
    <div>
        {{ translation }}
    </div>
    <button
        type="button"
        @click.prevent="toggle"
    >
        Toggle
    </button>
</template>
