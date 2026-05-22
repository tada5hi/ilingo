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
    it('updates textContent on a <p v-t="\'group.key\'"> element', async () => {
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
