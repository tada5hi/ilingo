/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { MemoryStore } from 'ilingo';
import { createApp } from 'vue';
import App from './App.vue';
import { install } from '../src';

const app = createApp(App);
install(app, {
    prefix: 'vuelidate',
    store: new MemoryStore({
        data: {
            // locale: de
            de: {
                // group: app
                vuelidate: {
                    maxLength: 'Die Länge der Eingabe muss kleiner als {{max}} sein.',
                    minLength: 'Die Länge der Eingabe muss größer als {{min}} sein.',
                },
            },
            // locale: en
            en: {
                vuelidate: {
                    maxLength: 'The length of the input must be less than {{max}}',
                    minLength: 'The length of the input must be greater than {{min}}',
                },
            },
        },
    }),
});
app.mount('#app');
