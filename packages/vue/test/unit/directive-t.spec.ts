/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { flushPromises, mount } from '@vue/test-utils';
import { MemoryStore } from 'ilingo';
import type { Ref } from 'vue';
import { defineComponent } from 'vue';
import { describe, expect, it, vi } from 'vitest';
import { injectLocale, install } from '../../src';

function plugin(messages: Record<string, unknown>, locale = 'en', options: { directives?: boolean } = {}) {
    return {
        install(app: import('vue').App) {
            install(app, {
                store: new MemoryStore({ data: messages as never }),
                locale,
                directives: options.directives,
            });
        },
    };
}

describe('v-t directive (#901)', () => {
    it('updates textContent on a <p v-t="\'namespace.key\'"> element', async () => {
        const Wrapper = defineComponent({
            template: '<p data-test="t" v-t="\'app.hi\'"></p>',
        });

        const wrapper = mount(Wrapper, {
            global: { plugins: [plugin({ en: { app: { hi: 'Hello there' } } })] },
        });

        await flushPromises();
        expect(wrapper.find('[data-test="t"]').text()).toEqual('Hello there');
    });

    it('accepts an object binding with data', async () => {
        const Wrapper = defineComponent({
            template: '<p data-test="t" v-t="{ path: \'app.greet\', data: { name: \'Peter\' } }"></p>',
        });

        const wrapper = mount(Wrapper, {
            global: { plugins: [plugin({ en: { app: { greet: 'Hi {{name}}!' } } })] },
        });

        await flushPromises();
        expect(wrapper.find('[data-test="t"]').text()).toEqual('Hi Peter!');
    });

    it('reactively updates when the injected locale Ref changes — without remounting', async () => {
        const Wrapper = defineComponent({
            template: '<p data-test="t" v-t="\'app.hi\'"></p>',
        });

        let localeRef: Ref<string> | undefined;

        const ProbeRoot = defineComponent({
            components: { Wrapper },
            template: '<Wrapper />',
            setup() {
                // Capture the injected locale Ref so the test can flip it.
                localeRef = injectLocale();
            },
        });

        const wrapper = mount(ProbeRoot, {
            global: {
                plugins: [plugin({
                    en: { app: { hi: 'Hello' } },
                    de: { app: { hi: 'Hallo' } },
                })],
            },
        });

        await flushPromises();
        const el = wrapper.find('[data-test="t"]').element as HTMLElement;
        expect(el.textContent).toEqual('Hello');

        // Element identity captured to assert no remount.
        const nodeBefore = el;

        localeRef!.value = 'de';
        await flushPromises();

        const nodeAfter = wrapper.find('[data-test="t"]').element as HTMLElement;
        expect(nodeAfter).toBe(nodeBefore);              // no remount
        expect(nodeAfter.textContent).toEqual('Hallo');  // updated
    });

    it('cancels in-flight lookups on locale change (no stale clobber)', async () => {
        // Regression: without onCleanup in the watchEffect, a slow `get()`
        // started under the previous locale could resolve after the locale
        // had already changed and clobber `textContent` with the stale
        // translation.
        const store = new MemoryStore({
            data: {
                en: { app: { hi: 'Hello' } },
                de: { app: { hi: 'Hallo' } },
            },
        });

        // Wrap the store to make `get()` artificially slow for 'en' but fast
        // for 'de'. Without the cancel-on-stale fix, the slow 'en' lookup
        // would resolve last and win.
        const originalGet = store.get.bind(store);
        store.get = async (ctx) => {
            if (ctx.locale === 'en') {
                await new Promise((r) => setTimeout(r, 30));
            }
            return originalGet(ctx);
        };

        const ProbeRoot = defineComponent({
            template: '<p data-test="t" v-t="\'app.hi\'"></p>',
        });

        let localeRef: Ref<string> | undefined;
        const ProbeRootWithLocale = defineComponent({
            components: { ProbeRoot },
            template: '<ProbeRoot />',
            setup() {
                localeRef = injectLocale();
            },
        });

        const wrapper = mount(ProbeRootWithLocale, {
            global: {
                plugins: [{
                    install(app: import('vue').App) {
                        install(app, { store, locale: 'en' });
                    },
                }],
            },
        });

        // Wait briefly so the initial 'en' lookup has *started* but not yet
        // resolved (its 30ms delay).
        await new Promise((r) => setTimeout(r, 5));

        // Flip locale to 'de' while 'en' is still in flight.
        localeRef!.value = 'de';

        // Let everything settle — the slow 'en' resolution races with the
        // fast 'de' resolution. With the fix, the cancelled 'en' branch
        // never writes textContent.
        await new Promise((r) => setTimeout(r, 80));
        await flushPromises();

        expect(wrapper.find('[data-test="t"]').text()).toEqual('Hallo');
    });

    it('falls back to namespace.key when instance.get() rejects', async () => {
        // Regression: the async IIFE inside the directive's watchEffect
        // previously had no try/catch; a rejected get() would surface as
        // an unhandled promise rejection and leave the textContent stale.
        const failingStore = {
            async get(): Promise<never> {
                throw new Error('boom');
            },
            async set() { /* noop */ },
            async getLocales() { return []; },
        };

        const Wrapper = defineComponent({
            template: '<p data-test="t" v-t="\'app.hi\'">initial</p>',
        });

        const wrapper = mount(Wrapper, {
            global: {
                plugins: [{
                    install(app: import('vue').App) {
                        install(app, { store: failingStore as never, locale: 'en' });
                    },
                }],
            },
        });

        await flushPromises();
        // Catches the rejection; falls back to the namespace.key contract used
        // when get() returns undefined.
        expect(wrapper.find('[data-test="t"]').text()).toEqual('app.hi');
    });

    it('directives: false opts out of v-t registration', () => {
        const Wrapper = defineComponent({
            template: '<p v-t="\'app.hi\'"></p>',
        });

        // Vue warns when a directive resolution fails but doesn't throw.
        // Assert by sniffing console.warn.
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        mount(Wrapper, {
            global: {
                plugins: [plugin({ en: { app: { hi: 'Hello' } } }, 'en', { directives: false })],
            },
        });
        const messages = warn.mock.calls.map((args) => String(args[0])).join('\n');
        expect(messages).toMatch(/Failed to resolve directive: t|directive "t"/i);
        warn.mockRestore();
    });
});
