/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { MemoryStore } from 'ilingo';
import {
    useEnglishTranslation,
    useFrenchTranslation,
    useGermanTranslation,
    useSpanishTranslation,
} from './translations';

export class VuelidateStore extends MemoryStore {
    constructor() {
        super({
            en: { vuelidate: useEnglishTranslation() },
            de: { vuelidate: useGermanTranslation() },
            fr: { vuelidate: useFrenchTranslation() },
            es: { vuelidate: useSpanishTranslation() },
        });
    }
}

export function createVuelidateStore() : VuelidateStore {
    return new VuelidateStore();
}
