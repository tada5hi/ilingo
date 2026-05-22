<script setup lang="ts">
interface IntegrationCard {
    name: string;
    accent: string;
    href: string;
    summary: string;
    bullets: string[];
}

const cards: IntegrationCard[] = [
    {
        name: '@ilingo/fs',
        accent: '#6366f1',
        href: '/integrations/fs',
        summary: 'Lazy-load translations from the file system, write them back as JSON.',
        bullets: [
            'Supports .ts, .mts, .js, .mjs, .cjs, .json, .conf',
            'Atomic persistence with write-tmp + rename',
            'Split read/write directories',
        ],
    },
    {
        name: '@ilingo/vue',
        accent: '#14b8a6',
        href: '/integrations/vue',
        summary: 'Vue 3 plugin with reactive locale, composable, and component.',
        bullets: [
            '<ITranslate> component for declarative use',
            'useTranslation() composable, reactive count + data',
            'provide / inject of Ilingo instance and locale Ref',
        ],
    },
    {
        name: '@ilingo/vuelidate',
        accent: '#f59e0b',
        href: '/integrations/vuelidate',
        summary: 'Drop-in messages for Vuelidate validators.',
        bullets: [
            'Built-in EN / DE / FR / ES translations',
            'Composables for base & nested validations',
            'Severity-aware error rendering',
        ],
    },
];
</script>

<template>
    <section class="il-showcase">
        <div class="il-showcase-inner">
            <header class="il-showcase-header">
                <h2>Pick your integration</h2>
                <p>Same core, three flavours. Mix and match — they all wrap the same Ilingo orchestrator.</p>
            </header>
            <div class="il-showcase-grid">
                <a
                    v-for="card in cards"
                    :key="card.name"
                    :href="card.href"
                    class="il-showcase-card"
                    :style="{ '--accent': card.accent }"
                >
                    <h3 class="il-showcase-name">
                        {{ card.name }}
                    </h3>
                    <p class="il-showcase-summary">
                        {{ card.summary }}
                    </p>
                    <ul class="il-showcase-bullets">
                        <li v-for="b in card.bullets" :key="b">
                            <span class="il-check">✓</span>{{ b }}
                        </li>
                    </ul>
                    <span class="il-showcase-cta">Read more →</span>
                </a>
            </div>
        </div>
    </section>
</template>

<style scoped>
.il-showcase {
    padding: 4rem 1.5rem;
}

.il-showcase-inner {
    max-width: 1200px;
    margin: 0 auto;
}

.il-showcase-header {
    text-align: center;
    margin-bottom: 2.5rem;
}

.il-showcase-header h2 {
    margin: 0 0 0.5rem;
    font-size: 2rem;
    font-weight: 700;
    letter-spacing: -0.01em;
    color: var(--il-color-fg);
}

.il-showcase-header p {
    margin: 0;
    color: var(--il-color-fg-muted);
    font-size: 1rem;
}

.il-showcase-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1rem;
}

@media (min-width: 640px) {
    .il-showcase-grid {
        grid-template-columns: repeat(2, 1fr);
    }
}

@media (min-width: 960px) {
    .il-showcase-grid {
        grid-template-columns: repeat(3, 1fr);
    }
}

.il-showcase-card {
    display: flex;
    flex-direction: column;
    padding: 1.5rem;
    border-radius: 0.75rem;
    border: 1px solid var(--il-color-border);
    background: var(--il-color-bg-elevated);
    text-decoration: none;
    color: inherit;
    position: relative;
    overflow: hidden;
    transition: transform 120ms ease, border-color 120ms ease;
}

.il-showcase-card::before {
    content: '';
    position: absolute;
    inset: 0 0 auto 0;
    height: 3px;
    background: var(--accent);
}

.il-showcase-card:hover {
    transform: translateY(-2px);
    border-color: var(--accent);
}

.il-showcase-name {
    margin: 0 0 0.375rem;
    font-size: 1.05rem;
    font-weight: 700;
    font-family: var(--vp-font-family-mono, ui-monospace, monospace);
    color: var(--il-color-fg);
}

.il-showcase-summary {
    margin: 0 0 1rem;
    font-size: 0.9rem;
    color: var(--il-color-fg-muted);
    line-height: 1.5;
}

.il-showcase-bullets {
    margin: 0 0 1rem;
    padding: 0;
    list-style: none;
    display: grid;
    gap: 0.375rem;
    flex-grow: 1;
}

.il-showcase-bullets li {
    display: flex;
    gap: 0.5rem;
    align-items: baseline;
    font-size: 0.85rem;
    color: var(--il-color-fg);
}

.il-check {
    color: var(--accent);
    font-weight: 700;
}

.il-showcase-cta {
    color: var(--accent);
    font-weight: 600;
    font-size: 0.9rem;
    margin-top: auto;
}
</style>
