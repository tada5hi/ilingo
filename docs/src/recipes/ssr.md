# Server-Side Rendering

Running ilingo through an SSR pipeline introduces three concerns:

1. **Per-request state.** Every incoming request can ask for a different locale. The `Ilingo` instance must not leak that state between requests on a long-lived server.
2. **Locale negotiation.** The locale isn't known until the request arrives — it has to be derived from `Accept-Language`, a cookie, a URL segment, or a combination.
3. **Hydration.** The client should render the translated HTML without re-fetching every locale file. Whatever the server resolved should be handed to the client.

The library ships every piece you need (`negotiateLocale`, `parseAcceptLanguage`, `Ilingo.clone`, `LoaderStore`), and stays framework-agnostic. This page shows the building blocks first, then sketches how each one slots into Nuxt and Astro.

## Building blocks

### 1. Build a fresh instance per request

The orchestrator is cheap to construct. Each request gets its own `Ilingo` so a `setLocale` from one request can't leak into another. The translation **data** (your catalog) stays shared — only the per-request configuration changes.

```typescript
// server/ilingo-factory.ts
import { Ilingo, MemoryStore, negotiateLocale, parseAcceptLanguage } from 'ilingo';
import { catalog } from '../locales';

const SUPPORTED = ['en', 'de', 'pt-BR'] as const;
const DEFAULT   = 'en';

// One store, shared. No per-request mutation here.
const store = new MemoryStore({ data: catalog });

export function ilingoForRequest(headers: { 'accept-language'?: string }): Ilingo {
    const requested = parseAcceptLanguage(headers['accept-language'] ?? '');
    const locale    = negotiateLocale(SUPPORTED, requested) ?? DEFAULT;

    return new Ilingo({ store, locale });
}
```

A cookie or URL-segment locale wins over `Accept-Language` if your app supports user-preference persistence — flow it into the same call:

```typescript
export function ilingoForRequest(
    headers: { 'accept-language'?: string },
    cookies: { locale?: string },
): Ilingo {
    const explicit = cookies.locale && SUPPORTED.includes(cookies.locale as typeof SUPPORTED[number])
        ? cookies.locale
        : undefined;
    const requested = parseAcceptLanguage(headers['accept-language'] ?? '');
    const locale    = explicit ?? negotiateLocale(SUPPORTED, requested) ?? DEFAULT;

    return new Ilingo({ store, locale });
}
```

See [Locales & Fallback → Negotiating a locale from a request](../guide/locales#negotiating-a-locale-from-a-request) for the matcher semantics.

### 2. Avoid a global `Ilingo`

The temptation is to spin up a single module-scope `Ilingo` and call `setLocale` per request. That works in single-tenant CLIs and serverless `event` handlers — it breaks on a long-lived Node server because two concurrent requests race on the locale field.

```typescript
// ❌ Don't — shared mutable locale on a long-lived server
const ilingo = new Ilingo({ store, locale: 'en' });

server.use((req, _res, next) => {
    ilingo.setLocale(req.locale);   // overwrites whatever the other in-flight request had
    next();
});
```

```typescript
// ✅ Do — one instance per request
server.use((req, _res, next) => {
    req.ilingo = ilingoForRequest(req.headers, req.cookies);
    next();
});
```

The factory is allocation-light: it constructs a per-instance plural-rules cache, a missing-key warn set, and a formatter registry — nothing else. The underlying `MemoryStore` and its catalog are shared.

### 3. Lazy-load locales with `LoaderStore`

For catalogs that ship one chunk per locale, `LoaderStore` lets a request only pull the locale it actually needs. The first request for `de` loads `./locales/de.json`; subsequent requests hit the in-memory cache.

```typescript
import { Ilingo, LoaderStore, negotiateLocale, parseAcceptLanguage } from 'ilingo';

const store = new LoaderStore({
    locales: ['en', 'de', 'pt-BR'],
    loader: async (locale, namespace) => {
        // namespace is your logical namespace; usually you ship one file per
        // (locale, namespace) pair. For a single file per locale, fold the
        // namespace into the path or ignore it.
        const mod = await import(`../locales/${locale}/${namespace}.json`);
        return mod.default;
    },
});

export function ilingoForRequest(headers: { 'accept-language'?: string }) {
    const requested = parseAcceptLanguage(headers['accept-language'] ?? '');
    const locale    = negotiateLocale(['en', 'de', 'pt-BR'], requested) ?? 'en';
    return new Ilingo({ store, locale });
}
```

The cache is shared across requests — that's the win. Misses (loader returning `undefined`) are cached too, so a typo in a request doesn't repeatedly hammer the loader. See [Stores → Loader Store](../guide/stores#loader-store) for the contract.

### 4. Hand state to the client

Serialise *only what the client needs* into the HTML, then rebuild on the client. Two flavours, depending on whether the client has the full catalog or just the rendered strings:

#### Pattern A — same catalog on both sides

When the client bundle already ships the catalog (small apps, JSON catalogs that gzip well), the server only needs to tell the client which locale it chose:

```html
<script type="application/json" id="__ilingo">
    {"locale": "de"}
</script>
```

```typescript
// client
import { Ilingo, MemoryStore } from 'ilingo';
import { catalog } from './locales';

const initial = JSON.parse(document.getElementById('__ilingo')!.textContent!);
const ilingo  = new Ilingo({
    store: new MemoryStore({ data: catalog }),
    locale: initial.locale,
});
```

#### Pattern B — server picks slices, client receives them

For larger catalogs you serialise the slice the client needs (e.g. only the locale that was negotiated, or only the namespaces rendered into the initial page). The client builds an `Ilingo` over the slice:

```typescript
// server-side render
const ilingo = ilingoForRequest(req.headers, req.cookies);
const locale = ilingo.getLocale();

// Pull only the slice needed for hydration. The catalog is a descriptor
// tree, so a single LocaleNode is itself a valid `CatalogInput` and
// serialises straight to JSON.
const slice = catalog.data.find((node) => node.name === locale);

res.send(renderShell({
    html:   renderApp(ilingo),
    state:  JSON.stringify({ locale, slice }),
}));
```

```typescript
// client
const { locale, slice } = JSON.parse(document.getElementById('__ilingo')!.textContent!);
const ilingo = new Ilingo({
    store:  new MemoryStore({ data: slice }), // a LocaleNode is a valid CatalogInput
    locale,
});
```

A common refinement: ship `slice` as `data` to `MemoryStore`, and *also* add a `LoaderStore` for the other locales. The user switching locale post-hydration triggers the loader; the initial render never pays for the others.

```typescript
const ilingo = new Ilingo({
    locale,
    store: new MemoryStore({ data: slice }),
});
ilingo.registerStore(new LoaderStore({
    locales: ['en', 'de', 'pt-BR'],
    loader: (loc, namespace) => import(`./locales/${loc}/${namespace}.json`).then((m) => m.default),
}));
// MemoryStore answers first (already-hydrated locale); LoaderStore covers everything else.
// The serial store walk (#917 Track B) means LoaderStore never fires for keys MemoryStore has.
```

## Nuxt

Nuxt's request lifecycle gives you `useRequestEvent()` on the server and `useState()` for hydration. The pattern slots in via a plugin that runs on both sides.

```typescript
// plugins/ilingo.ts
import { Ilingo, MemoryStore, negotiateLocale, parseAcceptLanguage } from 'ilingo';
import { install } from '@ilingo/vue';
import { catalog } from '~/locales';

const SUPPORTED = ['en', 'de'];

export default defineNuxtPlugin((nuxtApp) => {
    // useState gives a value that's serialised into payload on the server
    // and re-read on the client — exactly the hydration channel we want.
    const initial = useState<{ locale: string }>('ilingo', () => {
        if (import.meta.server) {
            const event   = useRequestEvent();
            const header  = getRequestHeader(event!, 'accept-language') ?? '';
            const wanted  = parseAcceptLanguage(header);
            return { locale: negotiateLocale(SUPPORTED, wanted) ?? 'en' };
        }
        return { locale: 'en' }; // hydration overrides this from payload
    });

    const ilingo = new Ilingo({
        store:  new MemoryStore({ data: catalog }),
        locale: initial.value.locale,
    });

    install(nuxtApp.vueApp, ilingo);
});
```

On the server, `useState` reads from the request and seeds the payload. On the client, `useState` reads from the serialised payload — Nuxt handles the wiring. Both branches build the same `Ilingo` shape, so SSR'd HTML matches the first client render.

For cookie-based locale persistence, replace the negotiation block with `useCookie('locale').value ?? negotiateLocale(...)`. For catalog chunking, swap `MemoryStore` for `LoaderStore` and feed `Nuxt's import()`-based dynamic imports into the loader.

A community Nuxt module isn't shipped in-tree — the plugin above is intentionally framework-thin so it works against Nuxt 3 / Nuxt 4 / any future variant without a versioned coupling.

## Astro

Astro's middleware attaches data to `Astro.locals`. Build the `Ilingo` there, then expose translated strings as props or via a context-style helper.

```typescript
// src/middleware.ts
import { defineMiddleware } from 'astro:middleware';
import { Ilingo, MemoryStore, negotiateLocale, parseAcceptLanguage } from 'ilingo';
import { catalog } from './locales';

const SUPPORTED = ['en', 'de'];
const store = new MemoryStore({ data: catalog });

export const onRequest = defineMiddleware((context, next) => {
    const header  = context.request.headers.get('accept-language') ?? '';
    const wanted  = parseAcceptLanguage(header);
    const locale  = negotiateLocale(SUPPORTED, wanted) ?? 'en';

    context.locals.ilingo = new Ilingo({ store, locale });
    return next();
});
```

```typescript
// src/env.d.ts
/// <reference types="astro/client" />
declare namespace App {
    interface Locals {
        ilingo: import('ilingo').Ilingo;
    }
}
```

```astro
---
// src/pages/index.astro
const greeting = await Astro.locals.ilingo.get({ namespace: 'app', key: 'greeting' });
---
<h1>{greeting}</h1>
```

For interactive islands (`client:*` directives) the same hydration patterns from [§4](#4-hand-state-to-the-client) apply: serialise the locale + the slice into a `<script type="application/json">` block, build a fresh `Ilingo` in the island's client entry.

## Edge runtimes

The `Ilingo` runtime is pure JavaScript: no `node:fs`, no `node:process` outside the optional `NODE_ENV` guard (which is replaced at build time by every modern bundler). Cloudflare Workers, Vercel Edge, Bun, and Deno all run the core unmodified. `@ilingo/fs` is the exception — it imports `node:fs/promises` and only works on a runtime with the Node filesystem APIs. If you need translations at the edge, ship them in the bundle (`MemoryStore` with an inlined catalog) or fetch them on demand via `LoaderStore` against an external API.

CI runs a [smoke script](https://github.com/tada5hi/ilingo/blob/master/packages/ilingo/test/smoke.mjs) against **Node** and **Bun** on every PR; the script boots the built `dist/index.mjs` and exercises the API end-to-end. It depends on no `node:*` modules, so adding Deno / Cloudflare Workers / browser runners to the matrix is one job-entry change. The `isProductionEnv()` guard (`typeof process !== 'undefined'` short-circuit + `try/catch` around `process.env` access) is covered separately by a unit test that simulates every runtime's globals — raw browser ESM, sparse polyfill, sandboxed `process.env` access, Bun-like environments. Together these prove the runtime-agnostic claim isn't speculative.

## See also

- [Locales & Fallback](../guide/locales) — `negotiateLocale` / `parseAcceptLanguage` and the fallback-chain matcher.
- [Stores](../guide/stores) — `MemoryStore`, `LoaderStore`, and the serial-on-miss composition.
- [Integrations → Vue](../integrations/vue) — what `install()` does and how `useTranslation` consumes the per-request instance.
