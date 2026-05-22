/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { flushPromises, mount } from '@vue/test-utils';
import { MemoryStore } from 'ilingo';
import { defineComponent, h } from 'vue';
import { describe, expect, it } from 'vitest';
import { ITranslateT, install } from '../../src';

function makeApp(messages: Record<string, Record<string, Record<string, unknown>>>) {
    return {
        install(app: import('vue').App) {
            install(app, {
                store: new MemoryStore({ data: messages }),
                locale: 'en',
            });
        },
    };
}

describe('<ITranslateT> — slot-aware interpolation (#900)', () => {
    it('renders a string-only message in a <span>', async () => {
        const wrapper = mount(ITranslateT, {
            props: { path: 'app.hi' },
            global: {
                plugins: [makeApp({ en: { app: { hi: 'Hello there' } } })],
            },
        });

        await flushPromises();
        expect(wrapper.element.tagName).toEqual('SPAN');
        expect(wrapper.text()).toEqual('Hello there');
    });

    it('substitutes {{var}} placeholders from `data`', async () => {
        const wrapper = mount(ITranslateT, {
            props: { path: 'app.greet', data: { name: 'Peter' } },
            global: {
                plugins: [makeApp({ en: { app: { greet: 'Hi {{name}}!' } } })],
            },
        });

        await flushPromises();
        expect(wrapper.text()).toEqual('Hi Peter!');
    });

    it('renders named scoped slots inline at their {slot} placeholders', async () => {
        const wrapper = mount(ITranslateT, {
            props: { path: 'app.cta' },
            slots: {
                cta: () => h('a', { href: '/start' }, 'get started'),
            },
            global: {
                plugins: [makeApp({
                    en: { app: { cta: 'Please {cta} to continue.' } },
                })],
            },
        });

        await flushPromises();
        expect(wrapper.text()).toEqual('Please get started to continue.');
        const a = wrapper.find('a');
        expect(a.exists()).toBe(true);
        expect(a.attributes('href')).toEqual('/start');
    });

    it('mixes vars and slots in a single message', async () => {
        const wrapper = mount(ITranslateT, {
            props: { path: 'app.welcome', data: { user: 'Peter' } },
            slots: {
                cta: () => h('strong', null, 'get started'),
            },
            global: {
                plugins: [makeApp({
                    en: {
                        app: {
                            welcome: 'Hi {{user}}, please {cta} now.',
                        },
                    },
                })],
            },
        });

        await flushPromises();
        expect(wrapper.text()).toEqual('Hi Peter, please get started now.');
        expect(wrapper.find('strong').exists()).toBe(true);
    });

    it('leaves an unfilled slot placeholder as literal `{slot}` text', async () => {
        const wrapper = mount(ITranslateT, {
            props: { path: 'app.cta' },
            // no `cta` slot provided
            global: {
                plugins: [makeApp({
                    en: { app: { cta: 'Please {cta} to continue.' } },
                })],
            },
        });

        await flushPromises();
        expect(wrapper.text()).toEqual('Please {cta} to continue.');
    });

    it('rejects a path without a group prefix', () => {
        expect(() => mount(ITranslateT, {
            props: { path: 'no-dot' },
            global: {
                plugins: [makeApp({ en: { app: {} } })],
            },
        })).toThrow(/group\.key/);
    });

    it('reacts to a dynamic `path` prop (no stale group/key)', async () => {
        // Regression: an earlier implementation parsed `props.path` once at
        // setup, so flipping the path after mount left the component stuck
        // on the original message.
        const Wrapper = defineComponent({
            components: { ITranslateT },
            data() {
                return { p: 'app.hi' };
            },
            template: '<ITranslateT :path="p" data-test="t" />',
        });

        const wrapper = mount(Wrapper, {
            global: {
                plugins: [makeApp({ en: { app: { hi: 'Hello', bye: 'Goodbye' } } })],
            },
        });

        await flushPromises();
        expect(wrapper.text()).toEqual('Hello');

        (wrapper.vm as never as { p: string }).p = 'app.bye';
        await flushPromises();
        expect(wrapper.text()).toEqual('Goodbye');
    });

    it('renders a fragment with no wrapper when tag=""', async () => {
        const wrapper = mount({
            components: { ITranslateT },
            template: '<div><ITranslateT path="app.hi" tag="" /></div>',
        }, {
            global: {
                plugins: [makeApp({ en: { app: { hi: 'Hello' } } })],
            },
        });

        await flushPromises();
        // No nested <span> — the text sits directly under <div>.
        expect(wrapper.find('span').exists()).toBe(false);
        expect(wrapper.text()).toEqual('Hello');
    });
});

