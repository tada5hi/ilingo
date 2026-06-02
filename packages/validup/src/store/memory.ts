/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    type IMutableStore,
    MemoryStore,
    type TranslationsNode,
    defineCatalog,
    defineLocale,
    defineNamespace,
    parseTranslationsRecord,
} from 'ilingo';
import { NAMESPACE, STORE_ID } from '../constants';
import {
    de, 
    en, 
    es, 
    fr,
} from '../translations';

/**
 * Eager in-memory catalog: all four shipped locales (`en`, `de`, `fr`,
 * `es`) for the `validup` namespace are materialised up front. This entry
 * point (`@ilingo/validup/store/memory`) statically imports the
 * translation modules, so importing it bundles every locale.
 *
 * For browsers that want per-locale code-splitting, use
 * `@ilingo/validup/store/loader` instead — it loads each locale on demand
 * via dynamic `import()` and never pulls the others into the bundle.
 */
export class Store extends MemoryStore {
    constructor() {
        super({
            id: STORE_ID,
            data: defineCatalog([
                defineLocale('en', [defineNamespace(NAMESPACE, [en])]),
                defineLocale('de', [defineNamespace(NAMESPACE, [de])]),
                defineLocale('fr', [defineNamespace(NAMESPACE, [fr])]),
                defineLocale('es', [defineNamespace(NAMESPACE, [es])]),
            ]),
        });
    }
}

/**
 * Build the eager in-memory `validup` catalog, keyed by {@link STORE_ID}.
 * Register it on any `Ilingo` instance — `Ilingo.registerStore` dedupes by
 * `store.id`, so re-registering is a no-op:
 *
 * ```typescript
 * import { Ilingo } from 'ilingo';
 * import { createMemoryStore } from '@ilingo/validup/store/memory';
 *
 * ilingo.registerStore(createMemoryStore());
 * ```
 */
export function createMemoryStore(): Store {
    return new Store();
}

/**
 * Seed the built-in `validup` translations into an existing data-backed
 * store via `set()` — for callers who want the catalog merged into their
 * own `MemoryStore` / `FSStore` rather than registered as a separate
 * store. Construct that store with `{ id: STORE_ID }` if you also want it
 * to dedupe as the validup catalog on `Ilingo.registerStore`.
 */
export async function extendStore(store: IMutableStore) {
    const translations : Record<string, TranslationsNode> = {
        en, 
        de, 
        fr, 
        es,
    };

    const promises : Promise<void>[] = [];

    const locales = Object.keys(translations);
    for (const locale of locales) {
        const node = translations[locale];
        const pairs = parseTranslationsRecord(node.data);
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
