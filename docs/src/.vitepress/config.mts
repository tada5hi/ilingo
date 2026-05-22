import { defineConfig } from 'vitepress';

export default defineConfig({
    title: 'ilingo',
    description: 'A lightweight, framework-agnostic translation and internationalization library for TypeScript — pluggable stores, BCP-47 fallback, ICU-lite plurals, Intl formatters.',
    base: '/',
    cleanUrls: true,
    lastUpdated: true,

    head: [
        ['link', { rel: 'icon', type: 'image/svg+xml', href: '/logo.svg' }],
        ['meta', { name: 'theme-color', content: '#6366f1' }],
        ['meta', { property: 'og:type', content: 'website' }],
        ['meta', { property: 'og:title', content: 'ilingo' }],
        ['meta', { property: 'og:description', content: 'A lightweight translation and internationalization library for TypeScript.' }],
        ['meta', { property: 'og:url', content: 'https://ilingo.tada5hi.net/' }],
    ],

    themeConfig: {
        logo: '/logo.svg',
        nav: [
            { text: 'Getting Started', link: '/getting-started/', activeMatch: '/getting-started/' },
            { text: 'Guide', link: '/guide/', activeMatch: '/guide/' },
            { text: 'Integrations', link: '/integrations/', activeMatch: '/integrations/' },
        ],
        sidebar: {
            '/getting-started/': [{
                text: 'Getting Started',
                items: [
                    { text: 'Introduction', link: '/getting-started/' },
                    { text: 'Installation', link: '/getting-started/installation' },
                    { text: 'Quick Start', link: '/getting-started/quick-start' },
                ],
            }],
            '/guide/': [
                {
                    text: 'Concepts',
                    items: [
                        { text: 'Overview', link: '/guide/' },
                        { text: 'Stores', link: '/guide/stores' },
                        { text: 'Locales & Fallback', link: '/guide/locales' },
                        { text: 'Templates & Data', link: '/guide/templates' },
                    ],
                },
                {
                    text: 'Features',
                    items: [
                        { text: 'Pluralization', link: '/guide/pluralization' },
                        { text: 'Formatters', link: '/guide/formatters' },
                        { text: 'Type-Safe Keys', link: '/guide/type-safe-keys' },
                        { text: 'Missing-Key Handler', link: '/guide/missing-key' },
                    ],
                },
            ],
            '/integrations/': [{
                text: 'Integrations',
                items: [
                    { text: 'Overview', link: '/integrations/' },
                    { text: 'File System', link: '/integrations/fs' },
                    { text: 'Vue', link: '/integrations/vue' },
                    { text: 'Vuelidate', link: '/integrations/vuelidate' },
                ],
            }],
        },
        socialLinks: [{ icon: 'github', link: 'https://github.com/tada5hi/ilingo' }],
        editLink: {
            pattern: 'https://github.com/tada5hi/ilingo/edit/master/docs/src/:path',
            text: 'Edit this page on GitHub',
        },
        search: { provider: 'local' },
        footer: {
            message: 'Released under the MIT License.',
            copyright: 'Copyright © 2024-present Peter Placzek',
        },
    },
});
