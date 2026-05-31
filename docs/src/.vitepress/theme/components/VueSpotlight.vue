<script setup lang="ts">
const code = `<script setup>
import { injectLocale, useTranslation } from '@ilingo/vue';

const locale = injectLocale();
const greeting = useTranslation({
    namespace: 'cart',
    key: 'greeting',
    data: { name: 'Paul' },
});
const items = useTranslation({
    namespace: 'cart',
    key: 'items',
    count: 3,
});
<\/script>

<template>
    <button @click="locale = 'de'">DE</button>
    <button @click="locale = 'en'">EN</button>

    <p>{{ greeting }}</p>
    <p>{{ items }}</p>

    <ITranslate path="cart.greeting" :data="{ name: 'Peter' }" />
<\/template>`;
</script>

<template>
    <section class="il-spotlight">
        <div class="il-spotlight-inner">
            <div class="il-spotlight-text">
                <div class="il-spotlight-eyebrow">
                    @ilingo/vue
                </div>
                <h2 class="il-spotlight-title">
                    First-class Vue 3 integration
                </h2>
                <p class="il-spotlight-tagline">
                    A drop-in plugin that wires <code>provide</code> / <code>inject</code> for the
                    <code>Ilingo</code> instance and a reactive locale <code>Ref</code> — plus a
                    <code>useTranslation</code> composable and an <code>&lt;ITranslate&gt;</code> component.
                </p>
                <ul class="il-spotlight-bullets">
                    <li><strong>Reactive.</strong> Translations re-compute on locale / count / data changes.</li>
                    <li><strong>Idempotent install.</strong> Call <code>install()</code> any number of times — it merges into an existing instance instead of clobbering it.</li>
                    <li><strong>No boilerplate.</strong> One plugin, two composables, one component. The whole surface fits on a postcard.</li>
                </ul>
                <a class="il-spotlight-cta" href="/integrations/vue">Read the Vue guide →</a>
            </div>
            <div class="il-spotlight-code">
                <div class="il-spotlight-code-toolbar">
                    <span class="il-dot il-dot-red" />
                    <span class="il-dot il-dot-yellow" />
                    <span class="il-dot il-dot-green" />
                    <span class="il-spotlight-code-title">CartHeader.vue</span>
                </div>
                <pre class="il-spotlight-pre"><code>{{ code }}</code></pre>
            </div>
        </div>
    </section>
</template>

<style scoped>
.il-spotlight {
    padding: 4rem 1.5rem 6rem;
}

.il-spotlight-inner {
    max-width: 1200px;
    margin: 0 auto;
    display: grid;
    grid-template-columns: 1fr;
    gap: 3rem;
    align-items: center;
}

@media (min-width: 960px) {
    .il-spotlight-inner {
        grid-template-columns: 1fr 1fr;
        gap: 4rem;
    }
}

.il-spotlight-eyebrow {
    display: inline-block;
    padding: 0.25rem 0.625rem;
    border-radius: 999px;
    background: color-mix(in oklab, var(--il-color-accent-500) 18%, transparent);
    color: var(--il-color-accent-600);
    font-family: var(--vp-font-family-mono, ui-monospace, monospace);
    font-size: 0.75rem;
    font-weight: 600;
    margin-bottom: 0.875rem;
}

.il-spotlight-title {
    margin: 0 0 0.75rem;
    font-size: 1.75rem;
    font-weight: 700;
    letter-spacing: -0.01em;
}

.il-spotlight-tagline {
    margin: 0 0 1.25rem;
    line-height: 1.6;
    color: var(--il-color-fg-muted);
}

.il-spotlight-tagline code,
.il-spotlight-bullets code {
    padding: 0.125rem 0.375rem;
    background: var(--il-color-bg-muted);
    border-radius: 0.25rem;
    font-size: 0.85em;
}

.il-spotlight-bullets {
    margin: 0 0 1.5rem;
    padding: 0;
    list-style: none;
    display: grid;
    gap: 0.625rem;
}

.il-spotlight-bullets li {
    padding-left: 1rem;
    position: relative;
    line-height: 1.5;
    color: var(--il-color-fg);
}

.il-spotlight-bullets li::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0.5rem;
    width: 0.375rem;
    height: 0.375rem;
    border-radius: 50%;
    background: var(--il-color-primary-500);
}

.il-spotlight-cta {
    color: var(--il-color-primary-500);
    font-weight: 600;
    text-decoration: none;
}

.il-spotlight-cta:hover {
    color: var(--il-color-primary-600);
}

.il-spotlight-code {
    border-radius: 0.875rem;
    border: 1px solid var(--il-color-border);
    background: var(--il-color-bg-elevated);
    overflow: hidden;
    box-shadow: 0 10px 30px -20px color-mix(in oklab, var(--il-color-primary-500) 30%, transparent);
}

.il-spotlight-code-toolbar {
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

.il-spotlight-code-title {
    margin-left: 0.5rem;
    font-family: var(--vp-font-family-mono, ui-monospace, monospace);
    font-size: 0.8rem;
    color: var(--il-color-fg-muted);
}

.il-spotlight-pre {
    margin: 0;
    padding: 1.25rem 1.5rem;
    font-family: var(--vp-font-family-mono, ui-monospace, monospace);
    font-size: 0.8rem;
    line-height: 1.6;
    color: var(--il-color-fg);
    background: var(--il-color-bg-elevated);
    overflow-x: auto;
    white-space: pre;
}
</style>
