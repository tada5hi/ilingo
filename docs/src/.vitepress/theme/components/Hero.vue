<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useData } from 'vitepress';
import { Ilingo, MemoryStore } from 'ilingo';

const catalog = {
    en: {
        cart: {
            greeting: 'Welcome, {{name}}!',
            items: {
                '@plural': {
                    one: '{{count}} item in your cart',
                    other: '{{count}} items in your cart',
                },
            },
            total: 'Total: {{amount, number(style=currency, currency=EUR)}}',
        },
    },
    de: {
        cart: {
            greeting: 'Willkommen, {{name}}!',
            items: {
                '@plural': {
                    one: '{{count}} Artikel im Warenkorb',
                    other: '{{count}} Artikel im Warenkorb',
                },
            },
            total: 'Gesamt: {{amount, number(style=currency, currency=EUR)}}',
        },
    },
    fr: {
        cart: {
            greeting: 'Bienvenue, {{name}} !',
            items: {
                '@plural': {
                    one: '{{count}} article dans votre panier',
                    other: '{{count}} articles dans votre panier',
                },
            },
            total: 'Total : {{amount, number(style=currency, currency=EUR)}}',
        },
    },
    'pt-BR': {
        cart: {
            greeting: 'Bem-vindo, {{name}}!',
            items: {
                '@plural': {
                    one: '{{count}} item no seu carrinho',
                    other: '{{count}} itens no seu carrinho',
                },
            },
            total: 'Total: {{amount, number(style=currency, currency=EUR)}}',
        },
    },
};

const ilingo = new Ilingo({
    store: new MemoryStore({ data: catalog }),
    locale: 'en',
});

const locales = [
    { code: 'en', label: 'English' },
    { code: 'de', label: 'Deutsch' },
    { code: 'fr', label: 'Français' },
    { code: 'pt-BR', label: 'Português (BR)' },
];

const state = reactive({
    locale: 'en',
    name: 'Peter',
    count: 3,
    amount: 49.9,
});

const chain = computed(() => ilingo.getResolvedLocaleChain({ locale: state.locale }));

// Initial values match the default state (locale=en, name=Peter, count=3,
// amount=49.9). Hardcoding them lets SSR ship rendered strings without
// requiring a top-level await (which would force a <Suspense> ancestor that
// VitePress's `layout: page` does not provide). `onMounted` re-runs the
// async ilingo lookup on the client to stay accurate if the catalog changes.
const greeting = ref('Welcome, Peter!');
const items = ref('3 items in your cart');
const total = ref('Total: €49.90');

async function renderAll () {
    const [greetingValue, itemsValue, totalValue] = await Promise.all([
        ilingo.get({ group: 'cart', key: 'greeting', locale: state.locale, data: { name: state.name } }),
        ilingo.get({ group: 'cart', key: 'items', locale: state.locale, count: state.count }),
        ilingo.get({ group: 'cart', key: 'total', locale: state.locale, data: { amount: state.amount } }),
    ]);
    greeting.value = greetingValue ?? '';
    items.value = itemsValue ?? '';
    total.value = totalValue ?? '';
}

watch(
    () => [state.locale, state.name, state.count, state.amount] as const,
    renderAll,
);

onMounted(renderAll);

const { isDark } = useData();

function toggleDark () {
    isDark.value = !isDark.value;
}
</script>

<template>
    <section class="il-hero">
        <div class="il-hero-bg" />
        <div class="il-hero-inner">
            <div class="il-hero-text">
                <h1 class="il-hero-title">
                    <span class="il-hero-title-grad">ilingo</span>
                </h1>
                <p class="il-hero-tagline">
                    A tiny, framework-agnostic translation library for TypeScript.
                    Pluggable stores, BCP-47 fallback chains, ICU-lite plurals, Intl-powered formatters — all in a few kilobytes.
                </p>
                <div class="il-hero-ctas">
                    <a class="il-btn il-btn-primary" href="/getting-started/">Get Started</a>
                    <a class="il-btn il-btn-ghost" href="https://github.com/tada5hi/ilingo" target="_blank" rel="noopener">View on GitHub</a>
                </div>
                <p class="il-hero-meta">
                    MIT licensed · Node 22+ · ESM-only · TypeScript-first
                </p>
            </div>

            <div class="il-hero-card">
                <div class="il-hero-card-toolbar">
                    <span class="il-dot il-dot-red" />
                    <span class="il-dot il-dot-yellow" />
                    <span class="il-dot il-dot-green" />
                    <span class="il-hero-card-title">ilingo.get(ctx)</span>
                    <button type="button" class="il-hero-card-toggle" @click="toggleDark">
                        {{ isDark ? 'Light' : 'Dark' }}
                    </button>
                </div>

                <div class="il-hero-card-body">
                    <div class="il-field">
                        <label class="il-label">locale</label>
                        <div class="il-locale-row">
                            <button
                                v-for="l in locales"
                                :key="l.code"
                                type="button"
                                class="il-locale-chip"
                                :class="{ 'il-locale-chip-active': state.locale === l.code }"
                                @click="state.locale = l.code"
                            >
                                {{ l.label }}
                            </button>
                        </div>
                        <p class="il-help">
                            chain: <code>{{ chain.join(' → ') }}</code>
                        </p>
                    </div>

                    <div class="il-grid-2">
                        <div class="il-field">
                            <label class="il-label">data.name</label>
                            <input v-model="state.name" class="il-input" type="text">
                        </div>
                        <div class="il-field">
                            <label class="il-label">count</label>
                            <input v-model.number="state.count" class="il-input" type="number" min="0" max="99">
                        </div>
                    </div>

                    <div class="il-field">
                        <label class="il-label">data.amount</label>
                        <input v-model.number="state.amount" class="il-input" type="number" step="0.01">
                    </div>

                    <div class="il-output">
                        <div class="il-output-row">
                            <span class="il-output-key">cart.greeting</span>
                            <span class="il-output-value">{{ greeting }}</span>
                        </div>
                        <div class="il-output-row">
                            <span class="il-output-key">cart.items</span>
                            <span class="il-output-value">{{ items }}</span>
                        </div>
                        <div class="il-output-row">
                            <span class="il-output-key">cart.total</span>
                            <span class="il-output-value">{{ total }}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </section>
</template>

<style scoped>
.il-hero {
    position: relative;
    padding: 4rem 1.5rem 5rem;
    overflow: hidden;
}

.il-hero-bg {
    position: absolute;
    inset: 0;
    pointer-events: none;
    background:
        radial-gradient(circle at 15% 10%, color-mix(in oklab, var(--il-color-primary-500) 18%, transparent), transparent 55%),
        radial-gradient(circle at 85% 90%, color-mix(in oklab, var(--il-color-accent-500) 14%, transparent), transparent 55%);
    z-index: 0;
}

.il-hero-inner {
    position: relative;
    z-index: 1;
    max-width: 1200px;
    margin: 0 auto;
    display: grid;
    grid-template-columns: 1fr;
    gap: 3rem;
    align-items: center;
}

@media (min-width: 960px) {
    .il-hero-inner {
        grid-template-columns: 1fr 1fr;
        gap: 4rem;
    }
}

.il-hero-title {
    margin: 0;
    font-size: clamp(3rem, 6vw, 4.5rem);
    line-height: 1.05;
    font-weight: 800;
    letter-spacing: -0.02em;
}

.il-hero-title-grad {
    background: linear-gradient(120deg, var(--il-color-primary-500), var(--il-color-accent-500));
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
}

.il-hero-tagline {
    margin: 1.25rem 0 2rem;
    font-size: 1.125rem;
    line-height: 1.6;
    color: var(--il-color-fg-muted);
    max-width: 36rem;
}

.il-hero-ctas {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
    margin-bottom: 1.25rem;
}

.il-btn {
    display: inline-flex;
    align-items: center;
    padding: 0.625rem 1.25rem;
    border-radius: 0.5rem;
    font-weight: 600;
    font-size: 0.95rem;
    text-decoration: none;
    transition: transform 120ms ease, background 120ms ease, border-color 120ms ease;
    border: 1px solid transparent;
}

.il-btn:hover {
    transform: translateY(-2px);
}

.il-btn-primary {
    background: var(--il-color-primary-500);
    color: #ffffff;
}

.il-btn-primary:hover {
    background: var(--il-color-primary-600);
}

.il-btn-ghost {
    background: transparent;
    color: var(--il-color-fg);
    border-color: var(--il-color-border);
}

.il-btn-ghost:hover {
    border-color: var(--il-color-primary-500);
    color: var(--il-color-primary-500);
}

.il-hero-meta {
    margin: 0;
    color: var(--il-color-fg-muted);
    font-size: 0.85rem;
}

.il-hero-card {
    background: var(--il-color-bg-elevated);
    border: 1px solid var(--il-color-border);
    border-radius: 0.875rem;
    box-shadow: 0 14px 40px -20px color-mix(in oklab, var(--il-color-primary-500) 35%, transparent);
    overflow: hidden;
}

.il-hero-card-toolbar {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    background: var(--il-color-bg-muted);
    border-bottom: 1px solid var(--il-color-border);
}

.il-dot {
    width: 0.625rem;
    height: 0.625rem;
    border-radius: 50%;
}

.il-dot-red { background: var(--il-color-error-500); }
.il-dot-yellow { background: var(--il-color-warning-500); }
.il-dot-green { background: var(--il-color-success-500); }

.il-hero-card-title {
    margin-left: 0.5rem;
    font-family: var(--vp-font-family-mono, ui-monospace, monospace);
    font-size: 0.8rem;
    color: var(--il-color-fg-muted);
}

.il-hero-card-toggle {
    margin-left: auto;
    padding: 0.25rem 0.625rem;
    font-size: 0.75rem;
    border-radius: 0.375rem;
    border: 1px solid var(--il-color-border);
    background: transparent;
    color: var(--il-color-fg-muted);
    cursor: pointer;
    transition: color 120ms ease, border-color 120ms ease;
}

.il-hero-card-toggle:hover {
    color: var(--il-color-primary-500);
    border-color: var(--il-color-primary-500);
}

.il-hero-card-body {
    padding: 1.5rem;
    display: grid;
    gap: 1rem;
}

.il-field {
    display: grid;
    gap: 0.375rem;
}

.il-grid-2 {
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: 0.75rem;
}

.il-label {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--il-color-fg-muted);
    font-family: var(--vp-font-family-mono, ui-monospace, monospace);
}

.il-input {
    padding: 0.5rem 0.75rem;
    border-radius: 0.375rem;
    border: 1px solid var(--il-color-border);
    background: var(--il-color-bg);
    color: var(--il-color-fg);
    font-size: 0.9rem;
    font-family: inherit;
    width: 100%;
}

.il-input:focus {
    outline: none;
    border-color: var(--il-color-primary-500);
    box-shadow: 0 0 0 3px color-mix(in oklab, var(--il-color-primary-500) 20%, transparent);
}

.il-locale-row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.375rem;
}

.il-locale-chip {
    padding: 0.375rem 0.75rem;
    border-radius: 999px;
    border: 1px solid var(--il-color-border);
    background: transparent;
    color: var(--il-color-fg-muted);
    font-size: 0.8rem;
    cursor: pointer;
    transition: background 120ms ease, color 120ms ease, border-color 120ms ease;
}

.il-locale-chip:hover {
    border-color: var(--il-color-primary-500);
    color: var(--il-color-primary-500);
}

.il-locale-chip-active {
    background: var(--il-color-primary-500);
    border-color: var(--il-color-primary-500);
    color: #ffffff;
}

.il-locale-chip-active:hover {
    color: #ffffff;
}

.il-help {
    margin: 0;
    font-size: 0.75rem;
    color: var(--il-color-fg-muted);
}

.il-help code {
    background: var(--il-color-bg-muted);
    padding: 0.125rem 0.375rem;
    border-radius: 0.25rem;
    font-size: 0.75rem;
}

.il-output {
    margin-top: 0.5rem;
    padding: 1rem;
    border-radius: 0.5rem;
    background: var(--il-color-bg-muted);
    border: 1px solid var(--il-color-border-muted);
    display: grid;
    gap: 0.5rem;
}

.il-output-row {
    display: grid;
    grid-template-columns: 8rem 1fr;
    gap: 0.75rem;
    align-items: baseline;
    font-size: 0.875rem;
}

.il-output-key {
    font-family: var(--vp-font-family-mono, ui-monospace, monospace);
    font-size: 0.75rem;
    color: var(--il-color-fg-muted);
}

.il-output-value {
    color: var(--il-color-fg);
    font-weight: 500;
}
</style>
