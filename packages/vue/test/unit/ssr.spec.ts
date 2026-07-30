/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    Ilingo,
    LoaderStore,
    MemoryStore,
    defineCatalog,
    defineLocale,
    defineNamespace,
    defineTranslations,
} from 'ilingo';
import { renderToString } from '@vue/server-renderer';
import {
    createSSRApp, defineComponent, h, ref,
} from 'vue';
import {
    afterEach, beforeEach, describe, expect, it, vi,
} from 'vitest';
import {
    ITranslateT, provideIlingo, provideLocale, useScopedCatalog, useTranslation,
} from '../../src';

const catalog = defineCatalog([
    defineLocale('en', [
        defineNamespace('app', [
            defineTranslations({
                name: 'Name',
                welcome: 'Hi {{user}}, click {cta} to continue.',
            }),
        ]),
    ]),
]);

function withProviders(child: any, store = new MemoryStore({ data: catalog })) {
    return defineComponent({
        setup() {
            provideIlingo(new Ilingo({ store }));
            provideLocale(ref('en'));
            return () => h('div', [h(child)]);
        },
    });
}

const UseTranslationChild = defineComponent({
    setup() {
        const text = useTranslation({ namespace: 'app', key: 'name' });
        return () => h('span', text.value);
    },
});

describe('server-side rendering (#988)', () => {
    let warn: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    });

    afterEach(() => {
        warn.mockRestore();
    });

    describe('markup', () => {
        it('writes the translation, not the placeholder, into the SSR output', async () => {
            const html = await renderToString(createSSRApp(withProviders(UseTranslationChild)));

            expect(html).toEqual('<div><span>Name</span></div>');
        });

        it('renders <ITranslateT> slots on the server', async () => {
            const Child = defineComponent({
                setup() {
                    return () => h(
                        ITranslateT,
                        { path: 'app.welcome', data: { user: 'Peter' } },
                        { cta: () => [h('a', { href: '/start' }, 'here')] },
                    );
                },
            });

            const html = await renderToString(createSSRApp(withProviders(Child)));

            expect(html).toEqual(
                '<div><span>Hi Peter, click <a href="/start">here</a> to continue.</span></div>',
            );
        });

        it('renders a scoped catalog on the server', async () => {
            const Child = defineComponent({
                setup() {
                    const { t } = useScopedCatalog({
                        messages: defineCatalog([
                            defineLocale('en', [
                                defineNamespace('modal', [
                                    defineTranslations({ title: 'Scoped title' }),
                                ]),
                            ]),
                        ]),
                    });
                    const title = t({ namespace: 'modal', key: 'title' });
                    return () => h('span', title.value);
                },
            });

            const html = await renderToString(createSSRApp(withProviders(Child)));

            expect(html).toEqual('<div><span>Scoped title</span></div>');
        });

        it('falls back to the placeholder when a store needs I/O', async () => {
            // A cold LoaderStore cannot answer synchronously, so the first
            // render is the placeholder — the pre-#988 behaviour, kept as the
            // documented fallback rather than a wrong value.
            const store = new LoaderStore({
                loader: () => defineTranslations({ name: 'Name' }),
            });
            const html = await renderToString(
                createSSRApp(withProviders(UseTranslationChild, store)),
            );

            expect(html).toEqual('<div><span>app.name</span></div>');
        });
    });

    describe('hydration', () => {
        it('hydrates server markup without a mismatch', async () => {
            const error = vi.spyOn(console, 'error').mockImplementation(() => {});

            const el = document.createElement('div');
            el.innerHTML = await renderToString(createSSRApp(withProviders(UseTranslationChild)));
            document.body.appendChild(el);

            createSSRApp(withProviders(UseTranslationChild)).mount(el);

            const messages = error.mock.calls.map((args) => String(args[0])).join('\n');
            error.mockRestore();

            expect(messages).not.toContain('Hydration');
            expect(el.innerHTML).toEqual('<div><span>Name</span></div>');
        });
    });
});
