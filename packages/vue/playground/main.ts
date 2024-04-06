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
    store: new MemoryStore({
        data: {
            // locale: de
            de: {
                // group: app
                app: {
                    key: 'Hallo mein Name ist {{name}}',
                },
            },
            // locale: en
            en: {
                app: {
                    key: 'Hello my name is {{name}}',
                },
            },
        },
    }),
});
app.mount('#app');
