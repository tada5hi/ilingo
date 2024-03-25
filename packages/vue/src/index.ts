/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { useIlingo } from 'ilingo';
import type { App, Plugin } from 'vue';
import ITranslate from './component.vue';
import { provideLocale } from './locale';
import { provideIlingo } from './module';
import type { Options } from './types';

export function install(app: App, options: Options = {}) : void {
    provideLocale(options.locale || 'en', app);

    const instance = useIlingo();
    if (options.data) {
        instance.setSync(options.data);
    }

    app.component('ITranslate', ITranslate);

    provideIlingo(instance, app);
}

export default {
    install,
} satisfies Plugin<Options | undefined>;

export { default as ITranslate } from './component.vue';
export * from './locale';
export * from './module';
export * from './types';
