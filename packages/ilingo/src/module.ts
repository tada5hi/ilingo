/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import process from 'node:process';
import type { ConfigInput } from './config';
import { LOCALE_DEFAULT } from './constants';
import type { IStore } from './store';
import type {
    Data,
    Fallback,
    GetContext,
    Leaf,
    MissingKeyContext,
    MissingKeyHandler,
    PluralLeaf,
} from './types';
import {
    isPluralLeaf,
    resolveLocaleChain,
    template,
} from './utils';

const warnedKeys = new Set<string>();

function defaultMissingKeyHandler(ctx: MissingKeyContext): undefined {
    /* istanbul ignore next */
    if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'production') {
        return undefined;
    }
    const id = `${ctx.resolvedLocale ?? ctx.locale ?? ''}|${ctx.group}|${ctx.key}`;
    if (!warnedKeys.has(id)) {
        warnedKeys.add(id);
        // eslint-disable-next-line no-console
        console.warn(
            `[ilingo] missing translation for "${ctx.group}.${ctx.key}" ` +
            `(locale=${ctx.resolvedLocale ?? ctx.locale ?? 'unknown'})`,
        );
    }
    return undefined;
}

export class Ilingo {
    public readonly stores: Set<IStore>;

    protected locale: string;

    protected fallback: Fallback | undefined;

    protected onMissingKey: MissingKeyHandler;

    // ----------------------------------------------------

    constructor(input: ConfigInput = {}) {
        this.locale = input.locale || LOCALE_DEFAULT;
        this.fallback = input.fallback;
        this.onMissingKey = input.onMissingKey || defaultMissingKeyHandler;

        this.stores = new Set<IStore>();
        if (input.store) {
            this.stores.add(input.store);
        }
    }

    // ----------------------------------------------------

    merge(instance: Ilingo) {
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
    async getResolvedLocale(ctx: GetContext): Promise<string | undefined> {
        const chain = this.getResolvedLocaleChain(ctx);
        for (const locale of chain) {
            for (const store of this.stores) {
                const leaf = await store.get({
                    locale,
                    group: ctx.group,
                    key: ctx.key,
                });
                if (typeof leaf !== 'undefined') {
                    return locale;
                }
            }
        }
        return undefined;
    }

    // ----------------------------------------------------

    async get(ctx: GetContext): Promise<string | undefined> {
        const chain = this.getResolvedLocaleChain(ctx);

        const hit = await this.lookup(chain, ctx);
        const resolvedLocale = hit?.locale;
        const leaf = hit?.leaf;

        if (typeof leaf === 'undefined') {
            const fallback = this.onMissingKey({
                ...ctx,
                resolvedLocale: chain[chain.length - 1],
            });
            return typeof fallback === 'string' ? fallback : undefined;
        }

        const message = this.selectPluralForm(leaf, resolvedLocale ?? this.getLocale(), ctx.count);
        const data: Data = { ...(ctx.data || {}) };
        if (typeof ctx.count === 'number' && typeof data.count === 'undefined') {
            data.count = ctx.count;
        }
        return this.format(message, data);
    }

    // ----------------------------------------------------

    /**
     * Walk the locale chain (then each store within a locale) and return the
     * first hit. Returns `undefined` when every store misses for every locale.
     */
    protected async lookup(
        chain: string[],
        ctx: GetContext,
    ): Promise<{ locale: string, leaf: Leaf } | undefined> {
        for (const locale of chain) {
            for (const store of this.stores) {
                const candidate = await store.get({
                    locale,
                    group: ctx.group,
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
        const category = new Intl.PluralRules(locale).select(count);
        const candidate = (leaf as PluralLeaf)[category];
        return typeof candidate === 'string' ? candidate : leaf.other;
    }

    /* istanbul ignore next */
    protected isPluralLeaf(value: unknown): value is PluralLeaf {
        return isPluralLeaf(value);
    }

    // ----------------------------------------------------

    format(input: string, data: Record<string, any>) {
        return template(input, data || {});
    }
}
