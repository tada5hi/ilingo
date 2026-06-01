/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { flushPromises, mount } from '@vue/test-utils';
import { LoaderStore, defineLines } from 'ilingo';
import { defineComponent } from 'vue';
import { describe, expect, it } from 'vitest';
import { install, useTranslation } from '../../src';

describe('useTranslation — store invalidation (#903 + #904)', () => {
    it('re-runs the computedAsync when the injected store fires invalidate', async () => {
        let version = 0;
        const store = new LoaderStore({
            loader: async () => defineLines({ hi: `Hello v${++version}` }),
        });

        const Probe = defineComponent({
            template: '<p data-test="t">{{ text }}</p>',
            setup() {
                const text = useTranslation({ namespace: 'app', key: 'hi' });
                return { text };
            },
        });

        const wrapper = mount(Probe, {
            global: {
                plugins: [{
                    install(app: import('vue').App) {
                        install(app, { store, locale: 'en' });
                    },
                }],
            },
        });

        await flushPromises();
        expect(wrapper.find('[data-test="t"]').text()).toEqual('Hello v1');

        // Invalidate — the next loader call returns v2.
        store.invalidate();
        await flushPromises();

        expect(wrapper.find('[data-test="t"]').text()).toEqual('Hello v2');
    });

    it('ignores invalidations scoped to a different namespace', async () => {
        let version = 0;
        const store = new LoaderStore({
            loader: async () => defineLines({ hi: `Hello v${++version}` }),
        });

        const Probe = defineComponent({
            template: '<p data-test="t">{{ text }}</p>',
            setup() {
                const text = useTranslation({ namespace: 'app', key: 'hi' });
                return { text };
            },
        });

        const wrapper = mount(Probe, {
            global: {
                plugins: [{
                    install(app: import('vue').App) {
                        install(app, { store, locale: 'en' });
                    },
                }],
            },
        });

        await flushPromises();
        expect(wrapper.find('[data-test="t"]').text()).toEqual('Hello v1');

        // Unrelated invalidation — should NOT trigger a re-run.
        store.invalidate('en', 'unrelated-namespace');
        await flushPromises();

        expect(wrapper.find('[data-test="t"]').text()).toEqual('Hello v1');

        // Targeted invalidation triggers re-run.
        store.invalidate('en', 'app');
        await flushPromises();
        expect(wrapper.find('[data-test="t"]').text()).toEqual('Hello v2');
    });
});
