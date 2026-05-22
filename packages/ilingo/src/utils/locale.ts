/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Fallback } from '../types';

/**
 * Derive the BCP-47 parent tags of a locale, from most-specific to most-generic.
 *
 * `pt-BR-Latn` → `['pt-BR', 'pt']`
 * `pt-BR`      → `['pt']`
 * `pt`         → `[]`
 */
export function bcp47Parents(locale: string): string[] {
    const parts = locale.split('-');
    const chain: string[] = [];
    for (let i = parts.length - 1; i > 0; i--) {
        chain.push(parts.slice(0, i).join('-'));
    }
    return chain;
}

/**
 * Resolve the ordered chain of locales to try for a single lookup.
 *
 * The returned array always starts with `locale` and ends with the default
 * locale, deduplicated. The middle is the explicit `fallback` if given,
 * otherwise the BCP-47 parent chain.
 */
export function resolveLocaleChain(
    locale: string,
    fallback: Fallback | undefined,
    defaultLocale: string,
): string[] {
    // Opt out of fallback entirely — chain is just the requested locale.
    if (fallback === false) {
        return [locale];
    }

    const explicit: string[] = [];

    if (typeof fallback === 'function') {
        explicit.push(...fallback(locale));
    } else if (Array.isArray(fallback)) {
        explicit.push(...fallback);
    } else if (typeof fallback === 'string') {
        explicit.push(fallback);
    } else {
        explicit.push(...bcp47Parents(locale));
    }

    // Order-preserving de-dupe that guarantees defaultLocale stays at the end.
    // A plain `new Set([...locale, ...explicit, defaultLocale])` would move
    // defaultLocale earlier in the chain if it appears in `explicit`.
    const seen = new Set<string>();
    const chain: string[] = [];
    for (const candidate of [locale, ...explicit]) {
        if (candidate !== defaultLocale && !seen.has(candidate)) {
            seen.add(candidate);
            chain.push(candidate);
        }
    }
    chain.push(defaultLocale);
    return chain;
}
