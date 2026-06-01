/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    CatalogInput,
    LocaleNode,
    Locales,
    NamespaceBodyInput,
    NamespaceChild,
    Translations,
} from '../types';
import {
    isCatalogNode,
    isLocaleNode,
    isNamespaceNode,
    isPluralNode,
    isTranslationsNode,
} from '../utils/identify';
import { isProductionEnv } from '../utils/env';

/**
 * Namespace key for translations placed directly under a locale (no enclosing
 * namespace node). Reserved for the future optional-namespace feature —
 * the normalizer already routes such translations here so the seam exists.
 */
const DEFAULT_NAMESPACE = '';

/**
 * Dev-only, one-shot diagnostics keyed by call-site. The normalizer accepts
 * only descriptor nodes; a non-node value is the tell-tale of a catalog that
 * hasn't been migrated to the tree format (a loader/file that forgot the
 * `defineTranslations(...)` wrapper, or a plain locale object passed where a tree is
 * expected). Without this it degrades silently to "every key missing".
 */
const warnedNodeShapes = new Set<string>();

function warnUnexpectedNode(context: string, received: unknown): void {
    /* istanbul ignore next */
    if (isProductionEnv()) {
        return;
    }
    if (warnedNodeShapes.has(context)) {
        return;
    }
    warnedNodeShapes.add(context);
    const kind = received === null ? 'null' : typeof received;
    // eslint-disable-next-line no-console
    console.warn(
        `[ilingo] ${context}: expected a catalog descriptor node but received ${kind}. ` +
        'Catalog input is tree-only — build it with defineCatalog / defineLocale / ' +
        'defineNamespace / defineTranslations (see the catalog-design guide).',
    );
}

/**
 * Deep-merge `source` translations into `target`. Strings and plural nodes are
 * terminal (last write wins); plain nested objects merge recursively. The
 * source tree is never mutated — only leaf values are shared by reference.
 */
function mergeLines(target: Translations, source: Translations): Translations {
    for (const key of Object.keys(source)) {
        const value = source[key];
        if (typeof value === 'string' || isPluralNode(value)) {
            target[key] = value;
            continue;
        }
        const existing = target[key];
        const base: Translations = (existing && typeof existing !== 'string' && !isPluralNode(existing)) ?
            existing as Translations :
            {};
        target[key] = mergeLines(base, value as Translations);
    }
    return target;
}

/**
 * Fold a namespace body into `namespaces` under `fullName`. Translations nodes
 * populate `namespaces[fullName]`; nested namespace nodes recurse with a
 * dotted-suffixed name. A namespace with only sub-namespaces creates no
 * entry of its own.
 */
function namespaceInto(
    namespaces: Record<string, Translations>,
    fullName: string,
    body: NamespaceChild[],
): void {
    for (const child of body) {
        if (isTranslationsNode(child)) {
            namespaces[fullName] = mergeLines(namespaces[fullName] || {}, child.data);
        } else if (isNamespaceNode(child)) {
            const nested = fullName ? `${fullName}.${child.name}` : child.name;
            namespaceInto(namespaces, nested, child.data);
        } else {
            warnUnexpectedNode('namespace child', child);
        }
    }
}

function toLocaleNodes(input: CatalogInput): LocaleNode[] {
    if (isCatalogNode(input)) {
        return input.data;
    }
    if (Array.isArray(input)) {
        return input;
    }
    return [input];
}

/**
 * Reduce a catalog tree to the internal `Locales` lookup shape. A nested
 * namespace node extends the dotted **namespace**; a nested object inside a
 * translations node extends the dotted **key**. Translations placed directly under a
 * locale (no namespace) land in the default namespace.
 *
 * Accepts a `CatalogNode`, a bare `LocaleNode[]`, or a single `LocaleNode`.
 */
export function normalizeCatalog(input: CatalogInput): Locales {
    const result: Locales = {};
    for (const locale of toLocaleNodes(input)) {
        if (!isLocaleNode(locale)) {
            warnUnexpectedNode('catalog locale', locale);
            continue;
        }
        const namespaces = result[locale.name] || (result[locale.name] = {});
        for (const child of locale.data) {
            if (isNamespaceNode(child)) {
                namespaceInto(namespaces, child.name, child.data);
            } else if (isTranslationsNode(child)) {
                namespaces[DEFAULT_NAMESPACE] = mergeLines(
                    namespaces[DEFAULT_NAMESPACE] || {},
                    child.data,
                );
            } else {
                warnUnexpectedNode('locale child', child);
            }
        }
    }
    return result;
}

/**
 * Reduce a single namespace body (from a `LoaderStore` loader or an
 * `@ilingo/fs` file, where `(locale, namespace)` is already known) to the
 * internal `Translations` shape. Returns an empty record for a non-translations body.
 */
export function normalizeNamespaceBody(body: NamespaceBodyInput): Translations {
    if (isTranslationsNode(body)) {
        return mergeLines({}, body.data);
    }
    warnUnexpectedNode('namespace body', body);
    return {};
}
