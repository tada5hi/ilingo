<script setup lang="ts">
import { ref } from 'vue';

interface Tab {
    label: string;
    code: string;
}

const tabs: Tab[] = [
    {
        label: 'Install',
        code: `npm install ilingo

# Optional adapters
npm install @ilingo/fs        # load locales from disk
npm install @ilingo/vue       # Vue 3 plugin
npm install @ilingo/vuelidate # Vuelidate validator messages`,
    },
    {
        label: 'Define',
        code: `import {
    Ilingo, MemoryStore,
    defineCatalog, defineLocale, defineNamespace, defineTranslations, definePlural,
} from 'ilingo';

const catalog = defineCatalog([
    defineLocale('en', [
        defineNamespace('cart', [
            defineTranslations({
                greeting: 'Welcome, {{name}}!',
                items: definePlural({
                    one: '{{count}} item in your cart',
                    other: '{{count}} items in your cart',
                }),
            }),
        ]),
    ]),
    defineLocale('de', [ /* …same shape… */ ]),
]);

const ilingo = new Ilingo({
    store: new MemoryStore({ data: catalog }),
    locale: 'en',
});`,
    },
    {
        label: 'Translate',
        code: `await ilingo.get({
    namespace: 'cart',
    key: 'greeting',
    data: { name: 'Peter' },
});
// "Welcome, Peter!"

await ilingo.get({
    namespace: 'cart',
    key: 'items',
    count: 3,
});
// "3 items in your cart"

await ilingo.get({
    namespace: 'cart',
    key: 'greeting',
    locale: 'de',
    data: { name: 'Peter' },
});
// "Willkommen, Peter!"`,
    },
];

const active = ref(0);
const copied = ref(false);
let timer: ReturnType<typeof setTimeout> | null = null;

function copy (code: string) {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return;
    void navigator.clipboard.writeText(code);
    copied.value = true;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => { copied.value = false; }, 1500);
}
</script>

<template>
    <section class="il-tabs-section">
        <div class="il-tabs-inner">
            <header class="il-tabs-header">
                <h2>From zero to first translation</h2>
                <p>Three steps. No decorators, no compiler plugins, no build-time codegen.</p>
            </header>
            <div class="il-tabs-card">
                <div class="il-tabs-toolbar">
                    <button
                        v-for="(t, i) in tabs"
                        :key="t.label"
                        type="button"
                        class="il-tab"
                        :class="{ 'il-tab-active': active === i }"
                        @click="active = i"
                    >
                        {{ t.label }}
                    </button>
                    <button
                        type="button"
                        class="il-copy"
                        @click="copy(tabs[active].code)"
                    >
                        {{ copied ? 'Copied' : 'Copy' }}
                    </button>
                </div>
                <pre class="il-pre"><code>{{ tabs[active].code }}</code></pre>
            </div>
        </div>
    </section>
</template>

<style scoped>
.il-tabs-section {
    padding: 4rem 1.5rem;
    background: var(--il-color-bg-muted);
    border-top: 1px solid var(--il-color-border-muted);
    border-bottom: 1px solid var(--il-color-border-muted);
}

.il-tabs-inner {
    max-width: 980px;
    margin: 0 auto;
}

.il-tabs-header {
    text-align: center;
    margin-bottom: 2rem;
}

.il-tabs-header h2 {
    margin: 0 0 0.5rem;
    font-size: 2rem;
    font-weight: 700;
    letter-spacing: -0.01em;
}

.il-tabs-header p {
    margin: 0;
    color: var(--il-color-fg-muted);
}

.il-tabs-card {
    border: 1px solid var(--il-color-border);
    border-radius: 0.75rem;
    overflow: hidden;
    background: var(--il-color-bg);
}

.il-tabs-toolbar {
    display: flex;
    align-items: stretch;
    border-bottom: 1px solid var(--il-color-border);
    background: var(--il-color-bg-elevated);
}

.il-tab {
    padding: 0.75rem 1.25rem;
    background: transparent;
    border: none;
    border-bottom: 2px solid transparent;
    color: var(--il-color-fg-muted);
    font-weight: 600;
    font-size: 0.9rem;
    cursor: pointer;
    transition: color 120ms ease, border-color 120ms ease;
}

.il-tab:hover {
    color: var(--il-color-primary-500);
}

.il-tab-active {
    color: var(--il-color-fg);
    border-bottom-color: var(--il-color-primary-500);
}

.il-copy {
    margin-left: auto;
    padding: 0 1rem;
    background: transparent;
    border: none;
    border-left: 1px solid var(--il-color-border);
    color: var(--il-color-fg-muted);
    font-size: 0.8rem;
    cursor: pointer;
    transition: color 120ms ease;
}

.il-copy:hover {
    color: var(--il-color-primary-500);
}

.il-pre {
    margin: 0;
    padding: 1.25rem 1.5rem;
    font-family: var(--vp-font-family-mono, ui-monospace, monospace);
    font-size: 0.85rem;
    line-height: 1.6;
    color: var(--il-color-fg);
    background: var(--il-color-bg);
    overflow-x: auto;
    white-space: pre;
}
</style>
