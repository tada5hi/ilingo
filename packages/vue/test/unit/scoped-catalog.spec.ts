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
import { install, useScopedCatalog, useTranslation } from '../../src';

function plugin(messages: Record<string, unknown>, locale = 'en') {
    return {
        install(app: import('vue').App) {
            install(app, {
                store: new MemoryStore({ data: messages as never }),
                locale,
            });
        },
    };
}

describe('useScopedCatalog (#902)', () => {
    it('returns a same-component `t` bound to the scoped instance', async () => {
        const Modal = defineComponent({
            template: '<p data-test="modal">{{ text }}</p>',
            setup() {
                const { t } = useScopedCatalog({
                    messages: {
                        en: { modal: { greeting: 'Scoped hello' } },
                    },
                });
                const text = t({ group: 'modal', key: 'greeting' });
                return { text };
            },
        });

        const wrapper = mount(Modal, {
            global: {
                plugins: [plugin({
                    en: { modal: { greeting: 'Default hello' } },
                })],
            },
        });

        await flushPromises();
        expect(wrapper.find('[data-test="modal"]').text()).toEqual('Scoped hello');
    });

    it('propagates the scope to descendant components via provideIlingo', async () => {
        // Child uses plain `useTranslation` and resolves via the scoped
        // instance that the parent's useScopedCatalog provided.
        const Body = defineComponent({
            template: '<p data-test="body">{{ text }}</p>',
            setup() {
                const text = useTranslation({ group: 'modal', key: 'greeting' });
                return { text };
            },
        });

        const Modal = defineComponent({
            components: { Body },
            template: '<Body />',
            setup() {
                useScopedCatalog({
                    messages: { en: { modal: { greeting: 'Scoped hello' } } },
                });
            },
        });

        const wrapper = mount(Modal, {
            global: {
                plugins: [plugin({
                    en: { modal: { greeting: 'Default hello' } },
                })],
            },
        });

        await flushPromises();
        expect(wrapper.find('[data-test="body"]').text()).toEqual('Scoped hello');
    });

    it('does not leak the scoped messages to a sibling component', async () => {
        const ModalBody = defineComponent({
            template: '<p data-test="modal">{{ text }}</p>',
            setup() {
                const text = useTranslation({ group: 'modal', key: 'greeting' });
                return { text };
            },
        });

        const Modal = defineComponent({
            components: { ModalBody },
            template: '<ModalBody />',
            setup() {
                useScopedCatalog({
                    messages: { en: { modal: { greeting: 'Scoped hello' } } },
                });
            },
        });

        const Sibling = defineComponent({
            template: '<p data-test="sibling">{{ text }}</p>',
            setup() {
                const text = useTranslation({ group: 'modal', key: 'greeting' });
                return { text };
            },
        });

        const Page = defineComponent({
            components: { Modal, Sibling },
            template: '<div><Modal /><Sibling /></div>',
        });

        const wrapper = mount(Page, {
            global: {
                plugins: [plugin({
                    en: { modal: { greeting: 'Default hello' } },
                })],
            },
        });

        await flushPromises();
        expect(wrapper.find('[data-test="modal"]').text()).toEqual('Scoped hello');
        // Sibling is OUTSIDE the modal's subtree — sees the parent default.
        expect(wrapper.find('[data-test="sibling"]').text()).toEqual('Default hello');
    });

    it('falls back to the parent catalog for keys not in the scope', async () => {
        const Modal = defineComponent({
            template: '<p data-test="modal">{{ text }}</p>',
            setup() {
                // Only `modal.greeting` is scoped. `app.foo` falls through.
                const { t } = useScopedCatalog({
                    messages: { en: { modal: { greeting: 'Scoped hello' } } },
                });
                const text = t({ group: 'app', key: 'foo' });
                return { text };
            },
        });

        const wrapper = mount(Modal, {
            global: {
                plugins: [plugin({
                    en: { app: { foo: 'global foo' } },
                })],
            },
        });

        await flushPromises();
        expect(wrapper.find('[data-test="modal"]').text()).toEqual('global foo');
    });
});
