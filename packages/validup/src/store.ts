/*
 * Copyright (c) 2026.
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

/**
 * Default translation store registered by `install()`. Maps the four
 * shipped locales (`en`, `de`, `fr`, `es`) onto a single catalog group
 * named `validup` whose keys are validup `IssueCode` runtime values.
 *
 * Consumers can extend the store by adding their own `MemoryStore`s to
 * the `Ilingo` instance — the merged result picks the first hit per
 * locale chain, so adding a higher-priority store (added first) lets
 * you override individual codes without re-shipping the whole catalog.
 */
export class Store extends MemoryStore {
    constructor() {
        super({
            data: {
                en: { validup: useEnglishTranslation() },
                de: { validup: useGermanTranslation() },
                fr: { validup: useFrenchTranslation() },
                es: { validup: useSpanishTranslation() },
            },
        });
    }
}

export function createStore() : Store {
    return new Store();
}
