/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { computedAsync } from '@vueuse/core';
import type { IIlingo, LocalesRecord } from 'ilingo';
import { MemoryStore } from 'ilingo';
import type { Ref } from 'vue';
import { unref } from 'vue';
import type { GetContextReactive } from '../types';
import { injectIlingo, provideIlingo } from './instance';
import { injectLocale } from './locale';
import { extractReactiveData } from './utils';

export interface UseScopedCatalogResult {
    /** The scoped `Ilingo` instance — exposed for advanced cases. */
    instance: IIlingo;
    /**
     * `useTranslation`-shaped lookup bound to the scoped instance. Use this
     * inside the same setup that called `useScopedCatalog` — provide/inject
     * is hierarchical, so a same-component `useTranslation` would still see
     * the parent instance.
     */
    t(ctx: GetContextReactive): Ref<string>;
}

/**
 * Scope a per-component message catalog. Creates a fresh `Ilingo` instance,
 * prepends a `MemoryStore` of `messages` (so scoped strings win), and
 * re-adds the parent's stores so non-scoped keys still fall through.
 *
 * Two ways to consume the scope:
 *
 * 1. **Same component** — use the returned `t` shorthand. Vue's
 *    provide/inject can't reach the current setup's own provides, so
 *    `useTranslation` in the same component would still see the parent.
 * 2. **Descendant components** — `useScopedCatalog` also calls
 *    `provideIlingo(scoped)`, so any child can just call `useTranslation`
 *    and get the scoped instance.
 *
 * No teardown is needed: Vue's provides are component-scoped, so the
 * scoped instance becomes unreachable on unmount and GC'd naturally.
 *
 * @example
 *     // Same-component shorthand:
 *     const { t } = useScopedCatalog({
 *         messages: { en: { modal: { greeting: 'Scoped hello' } } },
 *     });
 *     const greeting = t({ group: 'modal', key: 'greeting' });
 *
 *     // Descendants — child components just call useTranslation:
 *     <ScopedRoot>
 *         <ChildThatCallsUseTranslation />
 *     </ScopedRoot>
 */
export function useScopedCatalog(options: { messages: LocalesRecord }): UseScopedCatalogResult {
    const parent = injectIlingo();
    const locale = injectLocale();

    // `parent.clone()` inherits the parent's locale + fallback +
    // onMissingKey and shares the formatter registry, so the scoped
    // instance honours every config knob the parent set up. The scoped
    // store is registered *first* (so its translations win), then the
    // parent's stores fall through for anything not scoped.
    //
    // Note: the orchestrator's own `instance.locale` default is irrelevant
    // here — callers always pass `locale` from the injected Vue Ref (via
    // `t()` below, or `useTranslation` on descendants).
    const instance = parent.clone({ store: new MemoryStore({ data: options.messages }) });

    // Make the scoped instance available to descendants. Vue's
    // provide is component-local, so siblings outside this subtree are
    // unaffected — and the scope evaporates on unmount.
    provideIlingo(instance);

    function t(ctx: GetContextReactive): Ref<string> {
        const defaultValue = `${ctx.group}.${ctx.key}`;
        return computedAsync(
            async () => {
                const value = await instance.get({
                    locale: ctx.locale ?? locale.value,
                    data: ctx.data ? extractReactiveData(ctx.data) : undefined,
                    group: ctx.group,
                    key: ctx.key,
                    count: unref(ctx.count),
                });
                return value || defaultValue;
            },
            defaultValue,
        );
    }

    return { instance, t };
}
