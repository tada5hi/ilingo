/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IlingoOptions } from './options';
import { LOCALE_DEFAULT } from './constants';
import type { IStore } from './store';
import type {
    Data,
    Fallback,
    GetContext,
    IIlingo,
    Leaf,
    MissingKeyHandler,
} from './types';
import type { Formatter } from './utils';
import {
    FormatterRegistry,
    isProductionEnv,
    resolveLocaleChain,
    template,
} from './utils';

export class Ilingo implements IIlingo {
    /**
     * Registered stores, keyed by a `symbol` identity. Insertion order is
     * preserved (it drives the serial intra-locale store walk — earlier
     * registrations are consulted first) and the symbol key is how
     * registration deduplicates (see {@link registerStore}).
     *
     * Use `Symbol.for('@scope/pkg')` as the key for library catalogs so a
     * duplicate package copy (pnpm / peer-dep mismatch) resolves to the
     * same identity and re-registration stays a no-op.
     */
    public readonly stores: Map<symbol | string, IStore>;

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
     * Per-instance set of `(locale, namespace, key)` triples that have already
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

    constructor(input: IlingoOptions = {}) {
        this.locale = input.locale || LOCALE_DEFAULT;
        this.fallback = input.fallback;
        this.onMissingKey = input.onMissingKey;
        this.pluralRulesCache = new Map();
        this.warnedKeys = new Set();
        this.warnedFormatters = new Set();
        this.formatters = new FormatterRegistry();
        if (input.formatters) {
            for (const [name, fn] of Object.entries(input.formatters)) {
                this.formatters.register(name, fn);
            }
        }

        this.stores = new Map<symbol, IStore>();
        if (input.store) {
            const stores = Array.isArray(input.store) ? input.store : [input.store];
            for (const store of stores) {
                this.registerStore(store);
            }
        }
    }

    /**
     * Register a store, keyed by its own `store.id` identity.
     *
     * Idempotent: if a store is already registered under `store.id`, this
     * is a no-op and the existing store is kept. Library catalogs set
     * `id` to a `Symbol.for('@scope/pkg')` (e.g. `createMemoryStore()` /
     * `createLoaderStore()` from `@ilingo/validup`), so re-registering —
     * even from a duplicate package copy — never stacks duplicates.
     * Anonymous stores default to a fresh `Symbol(...)`, so each is always
     * added.
     *
     * Insertion order drives the serial intra-locale store walk, so a
     * store registered earlier is consulted first and wins per key. To
     * override individual keys of a library catalog, register your own
     * store before registering the library's.
     */
    registerStore(store: IStore): void {
        if (this.stores.has(store.id)) {
            return;
        }

        this.stores.set(store.id, store);
    }

    /**
     * Register a custom formatter for use inside `{{value, name(opts)}}`
     * placeholders. Equivalent to `this.formatters.register(name, fn)` —
     * exposed as an instance method for discoverability and parity with
     * `setLocale` / `merge` / `clone`.
     *
     * @example
     *     ilingo.registerFormatter('upper', (value, _opts, locale) =>
     *         String(value).toLocaleUpperCase(locale));
     *     await ilingo.get({
     *         namespace: 'app', key: 'shout',
     *         data: { name: 'peter' },
     *     });
     *     // "{{name, upper}}" → "PETER"
     */
    registerFormatter(name: string, formatter: Formatter): void {
        this.formatters.register(name, formatter);
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
     * `overrides.store`, when provided, becomes the **first** store(s) in
     * the new instance (resolved before any inherited store; an array is
     * registered in order). Other overrides replace the corresponding
     * inherited config field.
     *
     * `overrides.formatters`, when provided, is registered on the shared
     * registry — visible to both the parent and the child (consistent with
     * the registry-sharing design). Callers that need formatter isolation
     * should construct manually instead of cloning.
     *
     * Designed for consumers that need a scoped variant of an existing
     * orchestrator — e.g. `@ilingo/vue`'s `useScopedCatalog`.
     */
    clone(overrides: IlingoOptions = {}): IIlingo {
        const child = new Ilingo({
            store: overrides.store,
            locale: overrides.locale ?? this.locale,
            // Use `in`-check (not ??) so explicit `undefined` clears the
            // inherited value. Matches the `fallback` handling above —
            // both nullable config fields treat "field present in overrides"
            // as intent to replace, even when the new value is undefined.
            fallback: 'fallback' in overrides ? overrides.fallback : this.fallback,
            onMissingKey: 'onMissingKey' in overrides ? overrides.onMissingKey : this.onMissingKey,
        });
        // Inherit stores in order, preserving each store's symbol identity
        // (overrides.store, if any, was already added first by the
        // constructor under a minted symbol — appending parent's keeps the
        // precedence, and reusing the parent keys means a later merge()
        // dedupes correctly).
        for (const [id, store] of this.stores) {
            child.stores.set(id, store);
        }
        // Share the formatter registry so custom registrations on the parent
        // are honoured. Trade-off: mutations on either side are visible to
        // both. Callers that need isolation should construct manually.
        child.formatters = this.formatters;
        // Apply any new formatters from the overrides AFTER pointing at the
        // shared registry, so they land on the shared map and are visible to
        // the parent too. (Type contract: overrides.formatters is honoured.)
        if (overrides.formatters) {
            for (const [name, fn] of Object.entries(overrides.formatters)) {
                child.formatters.register(name, fn);
            }
        }
        return child;
    }

    /**
     * Fold another instance's stores into this one, deduping by symbol
     * identity. A foreign store whose key is already present is skipped
     * (the existing store wins); foreign keys not present here are appended
     * in order. Library catalogs keyed by `Symbol.for('@scope/pkg')` thus
     * never stack across a merge, while anonymously-keyed stores (minted
     * `Symbol()`) are always distinct and so always carried over.
     */
    merge(instance: IIlingo) {
        for (const [id, store] of instance.stores) {
            if (!this.stores.has(id)) {
                this.stores.set(id, store);
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
        for (const store of this.stores.values()) {
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
     * `(namespace, key)`, or `undefined` if the key is missing in every locale.
     */
    async getResolvedLocale(ctx: GetContext): Promise<string | undefined> {
        const chain = this.getResolvedLocaleChain(ctx);
        const hit = await this.lookup(chain, ctx);
        return hit?.locale;
    }

    // ----------------------------------------------------

    async get(ctx: GetContext): Promise<string | undefined> {
        const requestedLocale = ctx.locale ?? this.getLocale();
        const chain = this.getResolvedLocaleChain({ locale: requestedLocale });

        const hit = await this.lookup(chain, ctx);
        return hit ?
            this.render(hit.leaf, hit.locale, ctx) :
            this.handleMissingKey(ctx, requestedLocale, chain);
    }

    /**
     * The post-lookup half of `get()`: pick the plural form for `ctx.count`,
     * auto-merge `count` into the interpolation data (so `{{count}}` works
     * without restating it), and substitute `{{var}}` placeholders against
     * the *resolved* locale.
     */
    protected render(leaf: Leaf, locale: string, ctx: GetContext): string {
        const message = this.selectPluralForm(leaf, locale, ctx.count);
        const data: Data = { ...(ctx.data || {}) };
        if (typeof ctx.count === 'number' && typeof data.count === 'undefined') {
            data.count = ctx.count;
        }
        return this.format(message, data, locale);
    }

    // ----------------------------------------------------

    /**
     * Walk the locale chain in order. Within each locale, query stores
     * serially in insertion order and stop at the first hit.
     *
     * Locale-first composition: the closer locale always beats the farther
     * one, regardless of which store would have answered. Within a single
     * locale, a store is only consulted when every earlier store has
     * missed — so a network-backed adapter registered after a Memory
     * adapter is never called when the Memory adapter hits.
     */
    protected async lookup(
        chain: string[],
        ctx: Pick<GetContext, 'namespace' | 'key'>,
    ): Promise<{ locale: string, leaf: Leaf } | undefined> {
        if (this.stores.size === 0) {
            return undefined;
        }

        for (const locale of chain) {
            for (const store of this.stores.values()) {
                const candidate = await store.get({
                    locale,
                    namespace: ctx.namespace,
                    key: ctx.key,
                });
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

        const id = `${requestedLocale}|${ctx.namespace}|${ctx.key}`;
        if (!this.warnedKeys.has(id)) {
            this.warnedKeys.add(id);
            // eslint-disable-next-line no-console
            console.warn(
                `[ilingo] missing translation for "${ctx.namespace}.${ctx.key}" ` +
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
