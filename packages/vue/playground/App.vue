<script>
import {injectLocale, ITranslate} from "../src";
import {defineComponent} from "vue";

export default defineComponent({
    components: {
        ITranslate
    },
    setup() {
        const locale = injectLocale();

        const toggle = () => {
            locale.value = locale.value === 'de' ?
                'en' :
                'de';
        }

        return {
            toggle
        }
    }
})
</script>
<template>
    <div>
        <ITranslate dot-key="app.key" :data="{'name': 'Peter'}"></ITranslate>
    </div>
    <button type="button" @click.prevent="toggle">
        Toggle
    </button>
</template>
