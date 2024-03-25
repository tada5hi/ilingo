/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { DotKey } from 'ilingo';
import type { PropType } from 'vue';
import {
    defineComponent, ref, watch,
} from 'vue';
import { injectLocale } from './locale';
import { injectIlingo } from './module';

const ITranslate = defineComponent({
    props: {
        key: {
            type: String as PropType<DotKey>,
            required: true,
        },
        data: {
            type: Object as PropType<Record<string, any>>,
        },
    },
    async setup(props) {
        const translator = injectIlingo();
        const locale = injectLocale();

        const output = ref('');

        const translate = async () => {
            const value = await translator.get(props.key, props.data, locale.value);
            if (value) {
                output.value = value;
                return;
            }

            output.value = props.key;
        };

        await translate();

        watch(locale, () => {
            Promise.resolve()
                .then(() => translate());
        });

        return () => output;
    },
});

export {
    ITranslate,
};
