import{c as s,S as e,j as n,m as t}from"./chunks/framework.D39xfXuw.js";const g=JSON.parse('{"title":"Overview","description":"","frontmatter":{},"headers":[],"relativePath":"guide/index.md","filePath":"guide/index.md","lastUpdated":1779715227000}'),l={name:"guide/index.md"};function p(i,a,o,r,c,d){return e(),n("div",null,[...a[0]||(a[0]=[t(`<h1 id="overview" tabindex="-1">Overview <a class="header-anchor" href="#overview" aria-label="Permalink to &quot;Overview&quot;">​</a></h1><p>ilingo follows a small <strong>port-and-adapter</strong> design. Three pieces:</p><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>┌──────────────────────────────────┐</span></span>
<span class="line"><span>│           Ilingo                 │   ← orchestrator</span></span>
<span class="line"><span>│  (locale chain + store walk +    │</span></span>
<span class="line"><span>│   pluralization + templating)    │</span></span>
<span class="line"><span>└──────────────────────────────────┘</span></span>
<span class="line"><span>              │</span></span>
<span class="line"><span>              ▼</span></span>
<span class="line"><span>┌──────────────────────────────────┐</span></span>
<span class="line"><span>│            IStore                │   ← port</span></span>
<span class="line"><span>│  get(locale, group, key)         │</span></span>
<span class="line"><span>│  set(...)                        │</span></span>
<span class="line"><span>│  getLocales()                    │</span></span>
<span class="line"><span>└──────────────────────────────────┘</span></span>
<span class="line"><span>              ▲</span></span>
<span class="line"><span>              │ implements</span></span>
<span class="line"><span>   ┌──────────┴──────────┐</span></span>
<span class="line"><span>   │                     │</span></span>
<span class="line"><span>MemoryStore           FSStore           ← stock adapters</span></span>
<span class="line"><span>                     (@ilingo/fs)</span></span></code></pre></div><h2 id="the-flow-of-a-get" tabindex="-1">The flow of a <code>get()</code> <a class="header-anchor" href="#the-flow-of-a-get" aria-label="Permalink to &quot;The flow of a \`get()\`&quot;">​</a></h2><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>Input: { group, key, locale?, data?, count? }</span></span>
<span class="line"><span></span></span>
<span class="line"><span>1. requestedLocale = ctx.locale ?? instance default</span></span>
<span class="line"><span>2. chain           = resolveLocaleChain(requested, fallback config, &#39;en&#39;)</span></span>
<span class="line"><span>3. lookup:</span></span>
<span class="line"><span>       for each locale in chain:</span></span>
<span class="line"><span>           query every store in parallel</span></span>
<span class="line"><span>           first defined candidate (in declared store order) wins</span></span>
<span class="line"><span>4. miss?           → handleMissingKey → onMissingKey or warn-once default</span></span>
<span class="line"><span>5. selectPluralForm(leaf, hitLocale, count)</span></span>
<span class="line"><span>6. template(message, data, { locale: hitLocale, formatters })</span></span></code></pre></div><p>The chain is walked <strong>locale-first</strong>: the closest locale beats the farthest one regardless of which store holds the value. Within a single locale, all stores are queried concurrently and the first declared store with a hit wins.</p><h2 id="concepts" tabindex="-1">Concepts <a class="header-anchor" href="#concepts" aria-label="Permalink to &quot;Concepts&quot;">​</a></h2><table tabindex="0"><thead><tr><th>Concept</th><th>Page</th></tr></thead><tbody><tr><td>Pluggable storage backend</td><td><a href="./stores">Stores</a></td></tr><tr><td>BCP-47 fallback chain</td><td><a href="./locales">Locales &amp; Fallback</a></td></tr><tr><td><code>{{var}}</code> substitution + data merging</td><td><a href="./templates">Templates &amp; Data</a></td></tr><tr><td>CLDR-category plural selection</td><td><a href="./pluralization">Pluralization</a></td></tr><tr><td><code>Intl.NumberFormat</code> / <code>Intl.DateTimeFormat</code> / <code>Intl.ListFormat</code></td><td><a href="./formatters">Formatters</a></td></tr><tr><td>Compile-time typo prevention</td><td><a href="./type-safe-keys">Type-Safe Keys</a></td></tr><tr><td>Custom miss reporting</td><td><a href="./missing-key">Missing-Key Handler</a></td></tr></tbody></table>`,8)])])}const u=s(l,[["render",p]]);export{g as __pageData,u as default};
