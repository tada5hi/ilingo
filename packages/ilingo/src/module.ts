/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ConfigInput } from './config';
import { LOCALE_DEFAULT } from './constants';
import type { IStore } from './store';
import type {
    Data,
    Fallback,
    GetContext,
    GetParams,
    Groups,
    Key,
    Leaf,
    LocalesRecord,
    MissingKeyHandler,
} from './types';
import {
    FormatterRegistry,
    resolveLocaleChain,
    template,
} from './utils';

/**
 * `true` when running under a production bundle.
 *
 * Webpack's DefinePlugin and Vite's `define` replace the literal expression
 * `process.env.NODE_ENV` at build time. We reference it directly (rather
 * than via `globalThis`) so that replacement actually fires. The
 * `typeof process !== 'undefined'` guard makes raw-browser execution
 * (no polyfill, no bundler) safe.
 */
function isProductionEnv(): boolean {
    /* istanbul ignore next */
    try {
        return typeof process !== 'undefined' &&
            process.env != null &&
            process.env.NODE_ENV === 'production';
    } catch {
        return false;
    }
}

export class Ilingo<C extends LocalesRecord = LocalesRecord> {
    public readonly stores: Set<IStore>;

    protected locale: string;

    protected fallback: Fallback | undefined;

    protected onMissingKey: MissingKeyHandler | undefined;

    protected pluralRulesCache: Map<string, Intl.PluralRules>;

    /**
     * Per-instance registry for `{{value, formatter(opts)}}` template
     * modifiers. Built-in entries: `number`, `date`, `list` (each backed
     * by the matching `Intl.*Format`, memoised by `(locale, options)`).
     */
    public formatters: FormatterRegistry;

    /**
     * Per-instance set of `(locale, group, key)` triples that have already
     * triggered a missing-key warning. Kept on the instance — not module
     * scope — so multiple `Ilingo` instances do not dedupe each other's
     * warnings.
     */
    protected warnedKeys: Set<string>;

    /**
     * Mirror of `warnedKeys` for unknown-formatter diagnostics.
     */
    protected warnedFormatters: Set<string>;

    // ----------------------------------------------------

    constructor(input: ConfigInput = {}) {
        this.locale = input.locale || LOCALE_DEFAULT;
        this.fallback = input.fallback;
        this.onMissingKey = input.onMissingKey;
        this.pluralRulesCache = new Map();
        this.warnedKeys = new Set();
        this.warnedFormatters = new Set();
        this.formatters = new FormatterRegistry();

        this.stores = new Set<IStore>();
        if (input.store) {
            this.stores.add(input.store);
        }
    }

    // ----------------------------------------------------

    /**
     * Build a new `Ilingo` that inherits this instance's configuration
     * (locale, fallback, missing-key handler), shares its formatter
     * registry, and includes its stores in order. The new instance is
     * independent — mutating its `stores` does not affect the parent —
     * but the shared `formatters` registry means custom formatters
     * registered on either side are visible to both.
     *
     * `overrides.store`, when provided, becomes the **first** store in
     * the new instance (resolved before any inherited store). Other
     * overrides replace the corresponding inherited config field.
     *
     * Designed for consumers that need a scoped variant of an existing
     * orchestrator — e.g. `@ilingo/vue`'s `useScopedCatalog`.
     */
    clone(overrides: ConfigInput = {}): Ilingo {
        const child = new Ilingo({
            store: overrides.store,
            locale: overrides.locale ?? this.locale,
            fallback: 'fallback' in overrides ? overrides.fallback : this.fallback,
            onMissingKey: overrides.onMissingKey ?? this.onMissingKey,
        });
        // Inherit stores in order (overrides.store, if any, was already added
        // first by the constructor — appending parent's keeps the precedence).
        for (const store of this.stores) {
            child.stores.add(store);
        }
        // Share the formatter registry so custom registrations on the parent
        // are honoured. Trade-off: mutations on either side are visible to
        // both. Callers that need isolation should construct manually.
        child.formatters = this.formatters;
        return child;
    }

    merge(instance: Ilingo<LocalesRecord>) {
        const ownEntries = Array.from(this.stores.values());
        const foreignEntries = Array.from(instance.stores.values());

        for (const foreignEntry of foreignEntries) {
            let foreignEntriesIndex = -1;
            for (const [j, ownEntry] of ownEntries.entries()) {
                if (ownEntry === foreignEntry) {
                    foreignEntriesIndex = j;
                    break;
                }
            }

            if (foreignEntriesIndex === -1) {
                this.stores.add(foreignEntry);
            }
        }
    }

    // ----------------------------------------------------

    setLocale(key: string) {
        this.locale = key;
    }

    resetLocale() {
        this.locale = LOCALE_DEFAULT;
    }

    getLocale(): string {
        return this.locale;
    }

    // ----------------------------------------------------

    async getLocales(): Promise<string[]> {
        const locales: string[] = [];
        for (const store of this.stores) {
            locales.push(...await store.getLocales());
        }
        return Array.from(new Set(locales));
    }

    /**
     * Locale chain that would be tried for the given context, in order.
     */
    getResolvedLocaleChain(ctx: Pick<GetContext, 'locale'>): string[] {
        return resolveLocaleChain(
            ctx.locale || this.getLocale(),
            this.fallback,
            LOCALE_DEFAULT,
        );
    }

    /**
     * Which locale in the chain actually yielded a value for the given
     * `(group, key)`, or `undefined` if the key is missing in every locale.
     */
    async getResolvedLocale<G extends Groups<C>, K extends Key<C, G> & string>(
        ctx: GetParams<C, G, K>,
    ): Promise<string | undefined> {
        const internal = ctx as unknown as GetContext;
        const chain = this.getResolvedLocaleChain(internal);
        const hit = await this.lookup(chain, internal);
        return hit?.locale;
    }

    // ----------------------------------------------------

    async get<G extends Groups<C>, K extends Key<C, G> & string>(
        ctx: GetParams<C, G, K>,
    ): Promise<string | undefined> {
        const internal = ctx as unknown as GetContext;
        const requestedLocale = internal.locale ?? this.getLocale();
        const chain = this.getResolvedLocaleChain({ locale: requestedLocale });

        const hit = await this.lookup(chain, internal);

        if (!hit) {
            return this.handleMissingKey(internal, requestedLocale, chain);
        }

        const message = this.selectPluralForm(hit.leaf, hit.locale, internal.count);
        const data: Data = { ...(internal.data || {}) };
        if (typeof internal.count === 'number' && typeof data.count === 'undefined') {
            data.count = internal.count;
        }
        return this.format(message, data, hit.locale);
    }

    // ----------------------------------------------------

    /**
     * Walk the locale chain in order. Within each locale, query every store
     * in parallel and pick the first store (in declared insertion order) that
     * returned a hit.
     *
     * Locale order is preserved (closer locale beats farther one), but for a
     * single locale the I/O of multiple stores overlaps. The trade-off is that
     * stores later in the insertion order are still queried even when an
     * earlier store would have hit — wasted work for network-backed stores
     * but cheap for the in-memory + fs adapters shipped here. Custom stores
     * with side effects (e.g. metrics) will see every call.
     */
    protected async lookup(
        chain: string[],
        ctx: Pick<GetContext, 'group' | 'key'>,
    ): Promise<{ locale: string, leaf: Leaf } | undefined> {
        const stores = Array.from(this.stores);
        if (stores.length === 0) {
            return undefined;
        }

        for (const locale of chain) {
            const results = await Promise.all(
                stores.map((store) => store.get({
                    locale,
                    group: ctx.group,
                    key: ctx.key,
                })),
            );
            for (const candidate of results) {
                if (typeof candidate !== 'undefined') {
                    return { locale, leaf: candidate };
                }
            }
        }
        return undefined;
    }

    /**
     * Run the configured `onMissingKey` (or the built-in warn-once default)
     * and return whatever it produces.
     */
    protected handleMissingKey(
        ctx: GetContext,
        requestedLocale: string,
        chain: string[],
    ): string | undefined {
        if (this.onMissingKey) {
            const result = this.onMissingKey({
                ...ctx,
                locale: requestedLocale,
                resolvedLocale: chain[chain.length - 1],
            });
            return typeof result === 'string' ? result : undefined;
        }

        /* istanbul ignore next */
        if (isProductionEnv()) {
            return undefined;
        }

        const id = `${requestedLocale}|${ctx.group}|${ctx.key}`;
        if (!this.warnedKeys.has(id)) {
            this.warnedKeys.add(id);
            // eslint-disable-next-line no-console
            console.warn(
                `[ilingo] missing translation for "${ctx.group}.${ctx.key}" ` +
                `(locale=${requestedLocale})`,
            );
        }
        return undefined;
    }

    /**
     * Pick the matching plural form for `count`. Pass-through when the leaf
     * is already a string. Falls back to `other` if the selected category
     * isn't present.
     */
    protected selectPluralForm(leaf: Leaf, locale: string, count: number | undefined): string {
        if (typeof leaf === 'string') {
            return leaf;
        }
        if (typeof count !== 'number') {
            return leaf.other;
        }
        const category = this.getPluralRules(locale).select(count);
        const candidate = leaf[category];
        return typeof candidate === 'string' ? candidate : leaf.other;
    }

    protected getPluralRules(locale: string): Intl.PluralRules {
        let rules = this.pluralRulesCache.get(locale);
        if (!rules) {
            rules = new Intl.PluralRules(locale);
            this.pluralRulesCache.set(locale, rules);
        }
        return rules;
    }

    // ----------------------------------------------------

    /**
     * Substitute `{{var}}` placeholders. Modifier syntax
     * (`{{var, number(currency=EUR)}}`) is dispatched through
     * `this.formatters`. The optional `locale` argument controls which
     * locale `Intl.*Format` instances are constructed for; if omitted, the
     * instance's current locale is used.
     */
    format(input: string, data: Record<string, any>, locale?: string): string {
        return template(input, data || {}, {
            locale: locale ?? this.getLocale(),
            formatters: this.formatters,
            onUnknownFormatter: (name) => this.handleUnknownFormatter(name),
        });
    }

    protected handleUnknownFormatter(name: string): void {
        /* istanbul ignore next */
        if (isProductionEnv()) return;
        if (this.warnedFormatters.has(name)) return;
        this.warnedFormatters.add(name);
        // eslint-disable-next-line no-console
        console.warn(`[ilingo] unknown formatter "${name}" — falling back to raw value`);
    }
}
