/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { type IIlingo, MemoryStore } from 'ilingo';
import {
    useEnglishTranslation,
    useFrenchTranslation,
    useGermanTranslation,
    useSpanishTranslation,
} from './translations';


/**
 * Stable identity under which {@link register} keys the default
 * {@link Store}. A `Symbol.for(...)` global-registry symbol, so duplicate
 * package copies dedupe against the same key.
 */
export const STORE_ID = Symbol.for('@ilingo/vuelidate');

export class Store extends MemoryStore {
    constructor() {
        super({
            id: STORE_ID,
            data: {
                en: { vuelidate: useEnglishTranslation() },
                de: { vuelidate: useGermanTranslation() },
                fr: { vuelidate: useFrenchTranslation() },
                es: { vuelidate: useSpanishTranslation() },
            },
        });
    }
}

export function createStore() : Store {
    return new Store();
}


/**
 * Idempotently register the default Vuelidate-message {@link Store} (EN /
 * DE / FR / ES translations for the built-in validator names, under the
 * `vuelidate` group) on an `Ilingo` instance.
 *
 * The `install` hook delegates here. Idempotent via {@link STORE_ID}: a
 * no-op returning `false` when the catalog is already registered; returns
 * `true` when it added one.
 *
 * **Precedence.** The store is *appended* (consulted last). The
 * `vuelidate` group is a shared key-space — a store the caller registered
 * earlier (an app catalog overriding individual validator messages under
 * the `vuelidate` group) is hit first and wins per key, with this catalog
 * supplying the built-in defaults.
 */
export function register(ilingo: IIlingo): boolean {
    if (ilingo.stores.has(STORE_ID)) {
        return false;
    }
    ilingo.registerStore(createStore());
    return true;
}
