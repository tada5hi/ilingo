/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { flushPromises, mount } from '@vue/test-utils';
import { Ilingo, MemoryStore } from 'ilingo';
import { defineComponent } from 'vue';
import { describe, expect, it } from 'vitest';
import { install, useScopedCatalog, useTranslation } from '../../src';
import { toCatalog } from '../helpers/catalog';

function plugin(messages: Record<string, unknown>, locale = 'en') {
    return {
        install(app: import('vue').App) {
            install(app, {
                store: new MemoryStore({ data: toCatalog(messages as never) }),
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
                    messages: toCatalog({
                        en: { modal: { greeting: 'Scoped hello' } },
                    }),
                });
                const text = t({ namespace: 'modal', key: 'greeting' });
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
                const text = useTranslation({ namespace: 'modal', key: 'greeting' });
                return { text };
            },
        });

        const Modal = defineComponent({
            components: { Body },
            template: '<Body />',
            setup() {
                useScopedCatalog({
                    messages: toCatalog({ en: { modal: { greeting: 'Scoped hello' } } }),
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
                const text = useTranslation({ namespace: 'modal', key: 'greeting' });
                return { text };
            },
        });

        const Modal = defineComponent({
            components: { ModalBody },
            template: '<ModalBody />',
            setup() {
                useScopedCatalog({
                    messages: toCatalog({ en: { modal: { greeting: 'Scoped hello' } } }),
                });
            },
        });

        const Sibling = defineComponent({
            template: '<p data-test="sibling">{{ text }}</p>',
            setup() {
                const text = useTranslation({ namespace: 'modal', key: 'greeting' });
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

    it('inherits the parent fallback chain', async () => {
        // Regression: previously useScopedCatalog only copied stores, dropping
        // the parent's `fallback` config so scoped lookups walked a different
        // chain than the parent.
        const Modal = defineComponent({
            template: '<p data-test="modal">{{ text }}</p>',
            setup() {
                const { t } = useScopedCatalog({
                    messages: toCatalog({ en: { modal: { greeting: 'Scoped hello' } } }),
                });
                // Request a locale ('ru') that has no data anywhere; with the
                // parent's `fallback: 'de'` honoured, the chain reaches the
                // German parent translation. Without it, the lookup would fall
                // to 'en' (the default) and pick up the wrong message.
                const text = t({ namespace: 'app', key: 'farewell', locale: 'ru' });
                return { text };
            },
        });

        // Plugin with a custom `fallback: 'de'` on the parent Ilingo.
        const PluginWithFallback = {
            install(app: import('vue').App) {
                // Build a fresh Ilingo with a custom fallback, then install.
                // (Manual construction because the helper plugin() above
                // doesn't expose `fallback`.)
                const ilingo = new Ilingo({
                    fallback: 'de',
                    store: new MemoryStore({
                        data: toCatalog({
                            de: { app: { farewell: 'Tschüss aus DE' } },
                            en: { app: { farewell: 'Bye from EN' } },
                        }),
                    }),
                    locale: 'en',
                });
                install(app, ilingo);
            },
        };

        const wrapper = mount(Modal, {
            global: { plugins: [PluginWithFallback] },
        });

        await flushPromises();
        // 'ru' → fallback 'de' → 'Tschüss aus DE'. If fallback were dropped,
        // we'd see 'Bye from EN'.
        expect(wrapper.find('[data-test="modal"]').text()).toEqual('Tschüss aus DE');
    });

    it('falls back to the parent catalog for keys not in the scope', async () => {
        const Modal = defineComponent({
            template: '<p data-test="modal">{{ text }}</p>',
            setup() {
                // Only `modal.greeting` is scoped. `app.foo` falls through.
                const { t } = useScopedCatalog({
                    messages: toCatalog({ en: { modal: { greeting: 'Scoped hello' } } }),
                });
                const text = t({ namespace: 'app', key: 'foo' });
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
