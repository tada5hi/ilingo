/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { type Lines, LoaderStore } from 'ilingo';
import { NAMESPACE, STORE_ID } from '../constants';

/**
 * Per-locale dynamic loaders. Each `import()` is a distinct module
 * specifier, so a bundler (Rolldown / Vite / webpack) splits every locale
 * into its own chunk — only the locale actually requested at runtime is
 * fetched. Importing this entry point pulls in *none* of the translation
 * data up front (unlike `@ilingo/validup/store/memory`).
 */
const loaders: Record<string, () => Promise<Lines>> = {
    en: () => import('../translations/en').then((m) => m.useEnglishTranslation()),
    de: () => import('../translations/de').then((m) => m.useGermanTranslation()),
    fr: () => import('../translations/fr').then((m) => m.useFrenchTranslation()),
    es: () => import('../translations/es').then((m) => m.useSpanishTranslation()),
};

/**
 * Build a lazy `validup` catalog backed by a {@link LoaderStore}, keyed by
 * {@link STORE_ID}. Each locale's translations are fetched on first use
 * via dynamic `import()` and cached by the store thereafter — ideal for
 * browser bundles that shouldn't ship every locale eagerly.
 *
 * ```typescript
 * import { Ilingo } from 'ilingo';
 * import { createLoaderStore } from '@ilingo/validup/store/loader';
 *
 * ilingo.registerStore(createLoaderStore());
 * ```
 */
export function createLoaderStore(): LoaderStore {
    return new LoaderStore({
        id: STORE_ID,
        locales: Object.keys(loaders),
        loader: (locale, namespace) => {
            if (namespace !== NAMESPACE) {
                return undefined;
            }
            const load = loaders[locale];
            return load ? load() : undefined;
        },
    });
}
