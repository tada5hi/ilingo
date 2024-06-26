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
install(app);

app.mount('#app');
