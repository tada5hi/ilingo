/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createApp } from 'vue';
import App from './App.vue';
import { install } from '../src';

const app = createApp(App);
install(app, {
    data: {
        // locale: de
        de: {
            // group: app
            validation: {
                maxLength: 'Die Länge der Eingabe muss kleiner als {{max}} sein.',
                minLength: 'Die Länge der Eingabe muss größer als {{min}} sein.',
            },
        },
        // locale: en
        en: {
            validation: {
                maxLength: 'The length of the input must be less than {{max}}',
                minLength: 'The length of the input must be greater than {{min}}',
            },
        },
    },
});
app.mount('#app');
