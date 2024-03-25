/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { DotKey } from 'ilingo';
import { useIlingo } from 'ilingo';
import type { App, Plugin } from 'vue';
import { ITranslate } from './component';
import { injectLocale, provideLocale } from './locale';
import { provideIlingo } from './module';
import type { Options } from './types';

export function install(app: App, options: Options = {}) : void {
    provideLocale(options.locale || 'en', app);

    const instance = useIlingo();

    const translate = (
        keyWithGroup: DotKey,
        parameters: Record<string, any> = {},
    ) => {
        const locale = injectLocale();
        return instance.getSync(keyWithGroup, parameters, locale.value);
    };

    app.provide('translate', translate);
    app.component('ITranslate', ITranslate);

    provideIlingo(instance, app);
}

export default {
    install,
} satisfies Plugin<Options | undefined>;

export * from './component';
export * from './locale';
export * from './module';
export * from './types';
