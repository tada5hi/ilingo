<script setup lang="ts">
interface Feature {
    icon: string;
    title: string;
    detail: string;
}

const features: Feature[] = [
    {
        icon: '🪶',
        title: 'Tiny core',
        detail: 'Two-dependency runtime, ESM-only, browser-safe. Ships in kilobytes, not megabytes.',
    },
    {
        icon: '🧩',
        title: 'Pluggable stores',
        detail: 'A 3-method IStore port — in-memory by default, file-system adapter included, write your own in a few lines.',
    },
    {
        icon: '🌍',
        title: 'BCP-47 fallback',
        detail: 'Locale-first resolution walks pt-BR → pt → en automatically. Override with a string, array, function, or opt out.',
    },
    {
        icon: '🔢',
        title: 'ICU-lite plurals',
        detail: 'Intl.PluralRules-backed selection over CLDR categories. Plural leaves are explicit definePlural() nodes — no marker-key collisions.',
    },
    {
        icon: '🎨',
        title: 'Intl formatters',
        detail: 'Inline {{value, number(...)}}, date, and list modifiers — all locale-aware, all memoised per instance.',
    },
    {
        icon: '🧱',
        title: 'Typed authoring',
        detail: 'defineCatalog / defineLocale / defineNamespace build a typed descriptor tree; definePlural autocompletes CLDR categories and errors on a missing other.',
    },
];
</script>

<template>
    <section class="il-features">
        <div class="il-features-inner">
            <header class="il-features-header">
                <h2>One library. Six superpowers.</h2>
                <p>Every layer is replaceable, every contract is documented, every line is typed.</p>
            </header>
            <div class="il-features-grid">
                <div v-for="f in features" :key="f.title" class="il-feature-card">
                    <div class="il-feature-icon">
                        {{ f.icon }}
                    </div>
                    <h3 class="il-feature-title">
                        {{ f.title }}
                    </h3>
                    <p class="il-feature-detail">
                        {{ f.detail }}
                    </p>
                </div>
            </div>
        </div>
    </section>
</template>

<style scoped>
.il-features {
    padding: 4rem 1.5rem;
    background: var(--il-color-bg-muted);
    border-top: 1px solid var(--il-color-border-muted);
    border-bottom: 1px solid var(--il-color-border-muted);
}

.il-features-inner {
    max-width: 1200px;
    margin: 0 auto;
}

.il-features-header {
    text-align: center;
    margin-bottom: 2.5rem;
}

.il-features-header h2 {
    margin: 0 0 0.5rem;
    font-size: 2rem;
    font-weight: 700;
    letter-spacing: -0.01em;
    color: var(--il-color-fg);
}

.il-features-header p {
    margin: 0;
    color: var(--il-color-fg-muted);
    font-size: 1rem;
}

.il-features-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1rem;
}

@media (min-width: 640px) {
    .il-features-grid {
        grid-template-columns: repeat(2, 1fr);
    }
}

@media (min-width: 960px) {
    .il-features-grid {
        grid-template-columns: repeat(3, 1fr);
    }
}

.il-feature-card {
    padding: 1.5rem;
    border-radius: 0.75rem;
    border: 1px solid var(--il-color-border);
    background: var(--il-color-bg);
    transition: transform 120ms ease, border-color 120ms ease;
}

.il-feature-card:hover {
    transform: translateY(-2px);
    border-color: var(--il-color-primary-500);
}

.il-feature-icon {
    font-size: 1.5rem;
    margin-bottom: 0.75rem;
}

.il-feature-title {
    margin: 0 0 0.375rem;
    font-size: 1.05rem;
    font-weight: 700;
    color: var(--il-color-fg);
}

.il-feature-detail {
    margin: 0;
    font-size: 0.9rem;
    line-height: 1.5;
    color: var(--il-color-fg-muted);
}
</style>
