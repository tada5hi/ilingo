/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { computedAsync } from '@vueuse/core';
import { isInvalidatingStore } from 'ilingo';
import type { Ref } from 'vue';
import { onScopeDispose, ref, unref } from 'vue';
import type { GetContextReactive } from '../types';
import { extractReactiveData } from './utils';
import { injectIlingo } from './instance';
import { injectLocale } from './locale';

export function useTranslation(ctx: GetContextReactive): Ref<string> {
    const instance = injectIlingo();
    const locale = injectLocale();

    const defaultValue = `${ctx.group}.${ctx.key}`;

    // Bumping this ref forces the computedAsync below to re-run. Used by the
    // invalidation subscriptions further down — without a tracked dep that
    // changes on invalidate, computedAsync has no reason to re-execute.
    const invalidationTick = ref(0);

    // Subscribe to invalidation events from any InvalidatingStore in the
    // instance's store set. Filter by (group, key) — a watcher event for an
    // unrelated key should not cause us to re-render. The composable's
    // computedAsync re-runs on the next tick because `invalidationTick.value`
    // is in its dep set.
    const unsubscribes: Array<() => void> = [];
    for (const store of instance.stores.values()) {
        if (!isInvalidatingStore(store)) continue;
        const stop = store.on('invalidate', (invLocale, invGroup) => {
            if (invLocale !== undefined && invLocale !== (ctx.locale ?? locale.value)) return;
            if (invGroup !== undefined && invGroup !== ctx.group) return;
            invalidationTick.value += 1;
        });
        unsubscribes.push(stop);
    }
    onScopeDispose(() => {
        for (const stop of unsubscribes) stop();
    });

    return computedAsync(
        async () => {
            // Add the tick to the dep set so invalidation re-runs this block.
            // eslint-disable-next-line @typescript-eslint/no-unused-expressions
            invalidationTick.value;

            const value = await instance.get({
                locale: ctx.locale ?
                    ctx.locale :
                    locale.value,
                data: ctx.data ?
                    extractReactiveData(ctx.data) :
                    undefined,
                group: ctx.group,
                key: ctx.key,
                count: unref(ctx.count),
            });

            return value || defaultValue;
        },
        defaultValue,
    );
}
