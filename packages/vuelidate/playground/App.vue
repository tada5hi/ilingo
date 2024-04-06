<script>
import { IVuelidate } from "../src";
import {defineComponent, reactive} from "vue";
import useVuelidate from "@vuelidate/core";
import { minLength, maxLength } from "@vuelidate/validators";
import {injectLocale} from "@ilingo/vue";

export default defineComponent({
    components: {
        IVuelidate
    },
    setup() {
        const locale = injectLocale();

        const toggle = () => {
            locale.value = locale.value === 'de' ?
                'en' :
                'de';
        }

        const form = reactive({
            text: 'foo',
        });

        const v$ = useVuelidate({
            text: {
                minLength: minLength(5),
                maxLength: maxLength(10),
            },
        }, form);

        return {
            form,
            toggle,
            v$,
        };
    }
})
</script>
<template>
    <div>
        <div>
            <input type="text" v-model="form.text" />
        </div>
        <div>
            <IVuelidate :validation="v$.text" />
        </div>
    </div>
    <div>
        <button type="button" @click.prevent="toggle">
            Toggle
        </button>
    </div>
</template>
