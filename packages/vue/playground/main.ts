/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    MemoryStore,
    defineCatalog,
    defineLocale,
    defineNamespace,
    defineTranslations,
} from 'ilingo';
import { createApp } from 'vue';
import App from './App.vue';
import { install } from '../src';

const app = createApp(App);
install(app, {
    store: new MemoryStore({
        data: defineCatalog([
            defineLocale('de', [
                defineNamespace('app', [
                    defineTranslations({ key: 'Hallo mein Name ist {{name}}' }),
                ]),
            ]),
            defineLocale('en', [
                defineNamespace('app', [
                    defineTranslations({ key: 'Hello my name is {{name}}' }),
                ]),
            ]),
        ]),
    }),
});
app.mount('#app');
