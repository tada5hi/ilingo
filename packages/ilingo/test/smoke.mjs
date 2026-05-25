/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

/**
 * Cross-runtime smoke script.
 *
 * Loads the built `dist/index.mjs` exactly the way a published consumer
 * would, exercises a representative slice of the API (construct +
 * locale chain + fallback + plural + interpolation), and asserts the
 * expected outputs. Designed to run under any runtime that supports
 * ES2022 + ESM imports + Promises — Node, Bun, Deno, browsers, edge.
 *
 * CI runs this under Node and Bun (see `.github/workflows/main.yml`).
 * Other runtimes (Deno, Cloudflare Workers via miniflare, raw browser
 * via headless playwright) are not gated in CI but the script is
 * pure-JS / no-runtime-API so it can be wired in later if needed.
 *
 * Run locally: `node packages/ilingo/test/smoke.mjs`
 *               `bun packages/ilingo/test/smoke.mjs`
 */

import assert from 'node:assert/strict';
import { Ilingo, MemoryStore } from '../dist/index.mjs';

const ilingo = new Ilingo({
    store: new MemoryStore({
        data: {
            en: {
                app: {
                    greeting: 'Hi {{name}}',
                    cart: {
                        items: {
                            '@plural': {
                                one: '{{count}} item',
                                other: '{{count}} items',
                            },
                        },
                    },
                },
            },
            de: {
                app: {
                    greeting: 'Hallo {{name}}',
                    cart: { items: { '@plural': { one: '{{count}} Artikel', other: '{{count}} Artikel' } } },
                },
            },
            'pt-BR': { app: {} }, // empty — forces fallback
        },
    }),
    locale: 'en',
});

// ─── 1. plain string lookup ────────────────────────────────────────────
{
    const out = await ilingo.get({ group: 'app', key: 'greeting', data: { name: 'Peter' } });
    assert.equal(out, 'Hi Peter', '[1] cache-hit string with interpolation');
}

// ─── 2. plural form selection (count=1) ────────────────────────────────
{
    const out = await ilingo.get({ group: 'app', key: 'cart.items', count: 1 });
    assert.equal(out, '1 item', '[2] plural one form');
}

// ─── 3. plural form selection (count=5) ────────────────────────────────
{
    const out = await ilingo.get({ group: 'app', key: 'cart.items', count: 5 });
    assert.equal(out, '5 items', '[3] plural other form');
}

// ─── 4. locale switch ──────────────────────────────────────────────────
{
    ilingo.setLocale('de');
    const out = await ilingo.get({ group: 'app', key: 'greeting', data: { name: 'Peter' } });
    assert.equal(out, 'Hallo Peter', '[4] locale switch to de');
    ilingo.setLocale('en');
}

// ─── 5. BCP-47 fallback chain (pt-BR → pt → en) ────────────────────────
{
    const out = await ilingo.get({
        group: 'app',
        key: 'greeting',
        data: { name: 'Peter' },
        locale: 'pt-BR',
    });
    assert.equal(out, 'Hi Peter', '[5] fallback chain falls all the way to en');
}

// ─── 6. resolved-locale reporting ──────────────────────────────────────
{
    const out = await ilingo.getResolvedLocale({
        group: 'app',
        key: 'greeting',
        locale: 'pt-BR',
    });
    assert.equal(out, 'en', '[6] getResolvedLocale reports the terminator');
}

// ─── 7. missing key returns undefined, doesn't throw ───────────────────
{
    const out = await ilingo.get({ group: 'app', key: 'definitely-missing' });
    assert.equal(out, undefined, '[7] missing key returns undefined');
}

// Successful exit signals a green run; any failed assert throws and
// CI sees a non-zero exit.
// eslint-disable-next-line no-console
console.log('ok — 7 assertions passed');
