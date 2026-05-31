/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    type IStore,
    MemoryStore,
    type Namespaces,
    parseLinesRecord,
} from 'ilingo';
import { NAMESPACE, STORE_ID } from '../constants';
import {
    useEnglishTranslation,
    useFrenchTranslation,
    useGermanTranslation,
    useSpanishTranslation,
} from '../translations';

/**
 * Eager in-memory catalog: all four shipped locales (`en`, `de`, `fr`,
 * `es`) for the `vuelidate` namespace are materialised up front. This entry
 * point (`@ilingo/vuelidate/store/memory`) statically imports the
 * translation modules, so importing it bundles every locale.
 *
 * For apps that want per-locale code-splitting, use
 * `@ilingo/vuelidate/store/loader` instead — it loads each locale on
 * demand via dynamic `import()` and never pulls the others into the
 * bundle.
 */
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

/**
 * Build the eager in-memory `vuelidate` catalog, keyed by {@link STORE_ID}.
 * Register it on any `Ilingo` instance — `Ilingo.registerStore` dedupes by
 * `store.id`, so re-registering is a no-op:
 *
 * ```typescript
 * import { Ilingo } from 'ilingo';
 * import { createMemoryStore } from '@ilingo/vuelidate/store/memory';
 *
 * ilingo.registerStore(createMemoryStore());
 * ```
 */
export function createMemoryStore(): Store {
    return new Store();
}

/**
 * Seed the built-in `vuelidate` translations into an existing data-backed
 * store via `set()` — for callers who want the catalog merged into their
 * own `MemoryStore` / `FSStore` rather than registered as a separate
 * store. Construct that store with `{ id: STORE_ID }` if you also want it
 * to dedupe as the vuelidate catalog on `Ilingo.registerStore`.
 */
export async function extendStore(store: IStore) {
    const translations : Namespaces = {
        en: useEnglishTranslation(),
        de: useGermanTranslation(),
        fr: useFrenchTranslation(),
        es: useSpanishTranslation(),
    };

    const promises : Promise<void>[] = [];

    const locales = Object.keys(translations);
    for (const locale of locales) {
        const records = translations[locale];
        const pairs = parseLinesRecord(records);
        for (const pair of pairs) {
            promises.push(
                store.set({
                    locale,
                    namespace: NAMESPACE,
                    key: pair.key,
                    value: pair.value,
                }),
            );
        }
    }

    return await Promise.all(promises);
}

// Re-export the raw per-locale catalogs from the eager entry point (they
// are bundled here anyway). The lazy `loader` entry imports them on demand
// instead.
export * from '../translations';
