<script>
import { defineComponent, reactive } from 'vue';
import useVuelidate from '@vuelidate/core';
import { maxLength, minLength } from '@vuelidate/validators';
import { injectLocale } from '@ilingo/vue';
import { IVuelidate } from '../src';

export default defineComponent({
    components: {
        IVuelidate,
    },
    setup() {
        const locale = injectLocale();
        const set = (value) => {
            locale.value = value;
        };

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
            set,
            v$,
        };
    },
});
</script>
<template>
    <div>
        <div>
            <div>
                <input
                    v-model="v$.text.$model"
                    type="text"
                >
            </div>
            <div>
                <IVuelidate :validation="v$.text">
                    <template #default="props">
                        <template v-for="(item) in props.data">
                            {{ item.key }}({{ props.severity }}): {{ item.value }}
                        </template>
                    </template>
                </IVuelidate>
            </div>
        </div>
        <div>
            <button
                type="button"
                @click.prevent="set('de')"
            >
                de
            </button>
            <button
                type="button"
                @click.prevent="set('en')"
            >
                en
            </button>

            <button
                type="button"
                @click.prevent="set('es')"
            >
                es
            </button>
            <button
                type="button"
                @click.prevent="set('fr')"
            >
                fr
            </button>
        </div>
    </div>
</template>
