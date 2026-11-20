/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { flushPromises } from '@vue/test-utils';
import { LoaderStore, defineTranslations } from 'ilingo';
import { createApp, effectScope } from 'vue';
import {
    afterEach, describe, expect, it, vi,
} from 'vitest';
import { install, useTranslation } from '../../src';

function createStore() {
    let calls = 0;
    const store = new LoaderStore({
        loader: async () => {
            calls += 1;
            return defineTranslations({ hi: `Hello v${calls}` });
        },
    });

    return { store, calls: () => calls };
}

describe('useTranslation outside a component scope (#1075)', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('does not warn when called without an active effect scope', async () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const { store } = createStore();
        const app = createApp({ render: () => null });
        install(app, { store, locale: 'en' });

        const text = app.runWithContext(() => useTranslation({ namespace: 'app', key: 'hi' }));
        await flushPromises();

        expect(text.value).toEqual('Hello v1');
        expect(warn.mock.calls.flat().join('\n')).not.toMatch(/onScopeDispose/);
    });

    it('releases subscriptions when the caller stops its own effect scope', async () => {
        const { store, calls } = createStore();
        const app = createApp({ render: () => null });
        install(app, { store, locale: 'en' });

        const scope = effectScope();
        const text = app.runWithContext(() => scope.run(() => useTranslation({ namespace: 'app', key: 'hi' }))!);
        await flushPromises();
        expect(text.value).toEqual('Hello v1');

        store.invalidate();
        await flushPromises();
        expect(text.value).toEqual('Hello v2');

        scope.stop();
        store.invalidate();
        await flushPromises();

        expect(calls()).toEqual(2);
        expect(text.value).toEqual('Hello v2');
    });
});
