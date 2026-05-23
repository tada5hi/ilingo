/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { bcp47Parents } from './locale';

/**
 * Pick the best match between a list of supported locales and a list of
 * requested locales, using BCP-47 best-match semantics:
 *
 *   1. Exact match — if any `requested` entry equals a `supported` entry
 *      (case-insensitive language tag, case-sensitive region per BCP-47).
 *   2. Prefix match — if a `requested` tag is a parent of a `supported` tag
 *      (e.g. requested `pt` matches supported `pt-BR`).
 *   3. Parent match — if a `requested` tag's BCP-47 parents include a
 *      `supported` tag (e.g. requested `pt-PT` matches supported `pt`).
 *
 * Tags compared case-insensitively for the language sub-tag and
 * case-sensitively for the region sub-tag (`pt-BR`, not `PT-BR`). Region
 * sub-tags are canonicalised on input.
 *
 * Returns the matching `supported` entry, or `undefined` if nothing matches.
 *
 * Pure utility — does not mutate `Ilingo` state. Compose with
 * `ilingo.setLocale(negotiateLocale(supported, requested) ?? defaultLocale)`.
 *
 * @example
 *   negotiateLocale(['en', 'pt-BR'], ['pt-PT', 'pt', 'en']);
 *   // → 'pt-BR'  (requested 'pt' is a parent of supported 'pt-BR')
 *
 *   negotiateLocale(['en', 'de'], ['fr', 'es']);
 *   // → undefined
 */
export function negotiateLocale(
    supported: string[],
    requested: string[],
): string | undefined {
    if (supported.length === 0 || requested.length === 0) return undefined;

    const supportedSet = new Map<string, string>();
    for (const s of supported) {
        const key = canonicalize(s);
        if (!supportedSet.has(key)) supportedSet.set(key, s);
    }

    for (const r of requested) {
        const key = canonicalize(r);

        // 1. Exact.
        if (supportedSet.has(key)) return supportedSet.get(key)!;

        // 2. Prefix — requested 'pt' should match supported 'pt-BR'.
        for (const [supKey, supRaw] of supportedSet) {
            if (supKey === key || supKey.startsWith(`${key}-`)) {
                return supRaw;
            }
        }

        // 3. Parent walk — requested 'pt-PT' should match supported 'pt'.
        for (const parent of bcp47Parents(key)) {
            if (supportedSet.has(parent)) return supportedSet.get(parent)!;
        }
    }
    return undefined;
}

/**
 * Parse an HTTP `Accept-Language` header into an ordered list of locale tags,
 * sorted by quality (`q=`) descending. Tags lacking a `q=` parameter default
 * to `q=1.0` (RFC 9110).
 *
 * The `*` wildcard is dropped — callers that want a fallback should pass it
 * separately to `negotiateLocale`'s `requested` argument.
 *
 * @example
 *   parseAcceptLanguage('en-US,en;q=0.9,de;q=0.8');
 *   // → ['en-US', 'en', 'de']
 *
 *   parseAcceptLanguage('pt-PT;q=0.7, pt;q=0.5, *;q=0.1');
 *   // → ['pt-PT', 'pt']
 */
export function parseAcceptLanguage(header: string): string[] {
    if (!header) return [];

    const entries: { tag: string, q: number }[] = [];
    for (const raw of header.split(',')) {
        const item = raw.trim();
        if (!item) continue;
        const [tagRaw, ...params] = item.split(';');
        const tag = tagRaw.trim();
        if (!tag || tag === '*') continue;

        let q = 1;
        for (const param of params) {
            const [k, v] = param.split('=').map((s) => s.trim());
            if (k === 'q' && v !== undefined) {
                const parsed = Number(v);
                if (!Number.isNaN(parsed)) q = parsed;
            }
        }
        entries.push({ tag, q });
    }

    // Stable sort by q descending; entries with the same q keep their
    // declared order (Array.prototype.sort in V8 / SpiderMonkey is stable
    // since ES2019).
    entries.sort((a, b) => b.q - a.q);
    return entries.map((e) => e.tag);
}

/**
 * Canonicalise a BCP-47 tag for comparison: language sub-tag lowercase,
 * region sub-tag uppercase, script sub-tag titlecase. Matches the casing
 * convention browsers and `Intl.*` use when emitting tags.
 */
function canonicalize(tag: string): string {
    const parts = tag.split('-');
    if (parts.length === 0 || !parts[0]) return tag;

    return parts
        .map((part, i) => {
            if (i === 0) return part.toLowerCase();
            if (part.length === 2) return part.toUpperCase(); // region
            if (part.length === 4) {
                // script: titlecase
                return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
            }
            return part.toLowerCase();
        })
        .join('-');
}
