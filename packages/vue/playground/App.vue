<script>
import { ITranslate} from "../src";
import {defineComponent} from "vue";

export default defineComponent({
    components: {
        ITranslate
    }
})
</script>
<template>
    <div>
        <ITranslate dot-key="app.key" :data="{'name': 'Peter'}"></ITranslate>
    </div>
</template>
