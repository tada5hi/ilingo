<p align="center">
    <img src="https://raw.githubusercontent.com/tada5hi/ilingo/HEAD/packages/vue/assets/logo.svg" alt="@ilingo/vue" width="128" height="128" />
</p>

<h1 align="center">@ilingo/vue</h1>

<p align="center">
    <b>A <a href="https://vuejs.org">Vue 3</a> integration for <a href="https://www.npmjs.com/package/ilingo">ilingo</a>: provide/inject, a reactive locale, the <code>&lt;ITranslate&gt;</code> component, a <code>v-t</code> directive, and the <code>useTranslation</code> composable.</b>
</p>

<p align="center">
    <a href="https://www.npmjs.com/package/@ilingo/vue"><img src="https://img.shields.io/npm/v/@ilingo/vue" alt="npm version" /></a>
    <a href="https://github.com/tada5hi/ilingo/actions/workflows/main.yml"><img src="https://github.com/tada5hi/ilingo/actions/workflows/main.yml/badge.svg" alt="CI" /></a>
    <a href="https://codecov.io/gh/tada5hi/ilingo"><img src="https://codecov.io/gh/tada5hi/ilingo/branch/master/graph/badge.svg?token=4KNSG8L13V" alt="Coverage" /></a>
    <a href="https://bundlephobia.com/package/@ilingo/vue"><img src="https://img.shields.io/bundlephobia/minzip/@ilingo/vue" alt="minzipped size" /></a>
</p>

<p align="center">
    <a href="#installation"><b>Installation</b></a>
    ·
    <a href="#usage">Usage</a>
    ·
    <a href="#install-input">Install input</a>
    ·
    <a href="#ssr-the-first-render-is-not-a-placeholder">SSR</a>
    ·
    <a href="#itranslatet-slot-aware-interpolation"><code>&lt;ITranslateT&gt;</code></a>
    ·
    <a href="#v-t-directive"><code>v-t</code></a>
    ·
    <a href="#usescopedcatalog-per-component-message-scope"><code>useScopedCatalog</code></a>
</p>

---

Use [ilingo](https://www.npmjs.com/package/ilingo) in a Vue 3 app without wiring the reactivity yourself. `install()` provides one `Ilingo` instance and a locale `Ref` to the whole app; `useTranslation`, `<ITranslate>`, `<ITranslateT>` and `v-t` re-resolve when that locale changes. Each translation is seeded from `ilingo.getSync()`, so the first render, including the server render, already shows the real string.

## Installation

```bash
npm install @ilingo/vue ilingo vue @vueuse/core
```

ESM only. Peer dependencies: `ilingo` ^6.2.1, `vue` ^3.5.45 and `@vueuse/core` ^14.4.0 or ^15.0.0. `@ilingo/vue/core` re-exports `ilingo`.

## Usage

```typescript
import { install } from '@ilingo/vue';
import { MemoryStore, defineCatalog, defineLocale, defineNamespace, defineTranslations } from 'ilingo';
import { createApp } from 'vue';

const store = new MemoryStore({
    data: defineCatalog([
        // locale: de
        defineLocale('de', [
            // namespace: app
            defineNamespace('app', [
                defineTranslations({ key: 'Hallo mein Name ist {{name}}' }),
            ]),
        ]),
        // locale: en
        defineLocale('en', [
            defineNamespace('app', [
                defineTranslations({ key: 'Hello my name is {{name}}' }),
            ]),
        ]),
    ]),
})

const app = createApp(/* */);
install(app, {
    store,
});
app.mount('#app');
```

```vue

<script setup>
    import { injectLocale, useTranslation } from '@ilingo/vue';

    const locale = injectLocale();
    const set = (value) => {
        locale.value = value;
    }
    
    const translation = useTranslation({
        namespace: 'app', 
        key: 'key', 
        data: {
            name: 'Paul'
        }
    });
</script>
<template>
    <div>
        <ITranslate path="app.key" :data="{'name': 'Peter'}"/>
        <!-- Hello my name is Peter -->
    </div>
    <div>
        {{ translation }}
        <!-- Hello my name is Paul -->
    </div>
    <button type="button" @click.prevent="set('en')">
        en
    </button>
    <button type="button" @click.prevent="set('de')">
        de
    </button>
</template>
```

- `<ITranslate>` takes `path` (`'<namespace>.<key>'`) and `data`. The `path` is read once at setup; to switch keys, re-key the component.
- `useTranslation(ctx)` takes the `get()` context; `data` values and `count` may be `Ref`s. It returns a `Ref<string>` that starts as `namespace.key` when the stores cannot answer synchronously, and it also re-resolves when a store [invalidates](https://ilingo.tada5hi.net/guide/stores) a namespace (for example `FSStore` in watch mode).
- `injectLocale()` returns the app's locale `Ref`; assigning it switches every translation in the app.

### Outside a component

`useTranslation` cleans up (store `invalidate` subscriptions, the `computedAsync` watcher) when the active effect scope is disposed. Called outside one, for example under `app.runWithContext()`, wrap it in your own `effectScope()` and call `scope.stop()` when done:

```ts
import { effectScope } from 'vue';
import { useTranslation } from '@ilingo/vue';

const scope = effectScope();
const label = app.runWithContext(() => scope.run(() => useTranslation({ namespace: 'app', key: 'save' }))!);

scope.stop();
```

## Install input

`install(app, input?)` (also the plugin's default export, so `app.use(plugin, input)` works) accepts:

| Input | Effect |
|---|---|
| `{ store, locale?, directives? }` | Creates an `Ilingo` with `store` (or registers `store` on an instance that is already provided). `locale` sets the initial locale `Ref` (default `'en'`). `directives: false` skips registering `v-t` |
| an `Ilingo` / `IIlingo` instance | Provides that instance (or merges its stores into one already provided). The locale `Ref` starts at `instance.getLocale()`. `v-t` is always registered |
| nothing | Keeps the instance that is already provided, or creates and provides an empty `Ilingo` |

`<ITranslate>` and `<ITranslateT>` are registered globally in every case. `provideIlingo` / `injectIlingo` / `injectIlingoSafe` and `provideLocale` / `injectLocale` / `injectLocaleSafe` expose the same provide/inject pair for custom integrations; `applyInstallInput(app, input)` is the install logic without the component registration, used by the validation packages.

## SSR: the first render is not a placeholder

`useTranslation` (and `<ITranslate>`, `<ITranslateT>`, `useScopedCatalog().t`) wraps the asynchronous `Ilingo.get()` in a `computedAsync`, which needs an initial value before its promise settles. That initial value comes from `Ilingo.getSync()`, the synchronous read path, so with an in-memory catalog the **first** render is already the real string rather than the `namespace.key` placeholder ([#988](https://github.com/tada5hi/ilingo/issues/988)).

For server-side rendering that removes a whole class of bugs: the translated string is what lands in the SSR markup, and the client's first render matches it instead of warning

```text
[Vue warn]: Hydration text mismatch in th
  - rendered on server: "Name"
  - expected on client: "app.name"
```

No opt-in, no payload plumbing. `FSStore` reads a cold namespace from disk synchronously, so file-backed keys are seeded too. Stores that need asynchronous I/O (a `LoaderStore` before its chunk has loaded, a remote adapter) can't answer synchronously: those keys start at the placeholder (`namespace.key` for `useTranslation` and `<ITranslate>`, an empty string for `<ITranslateT>`) and settle a tick later. Warm them before rendering if the server output matters.

`v-t` is the exception: it fills `textContent` after the element mounts, so on the server it renders an empty element. Use `useTranslation` or `<ITranslate>` for text that must be in the SSR markup. See the [SSR recipe](https://ilingo.tada5hi.net/recipes/ssr) and [`getSync`](https://ilingo.tada5hi.net/guide/stores#synchronous-reads-getsync).

## `<ITranslateT>`: slot-aware interpolation

`<ITranslateT>` lets a message string carry **slot placeholders** alongside the usual `{{var}}` interpolations. Each `{slot}` placeholder in the message is filled by a named scoped slot, so you can drop arbitrary VNodes (links, icons, bold runs) inline without splitting the message across multiple keys.

Message: `"Hi {{user}}, please {cta} to continue."`

```vue
<ITranslateT path="app.welcome" :data="{ user: 'Peter' }">
    <template #cta>
        <a href="/start">get started</a>
    </template>
</ITranslateT>
<!-- → <span>Hi Peter, please <a href="/start">get started</a> to continue.</span> -->
```

- Props: `path`, `data`, plus optional `locale` (overrides the app locale) and `count` (plural selection). Unlike `<ITranslate>`, a changed `path` is picked up.
- Rendered tag: `<span>` by default. Override with `tag="p"` etc.; pass `tag=""` to render a fragment with no wrapper.
- Unfilled slot placeholders stay as literal `{slot}` text (no throw).
- `{{var}}` placeholders that have no matching `data` key stay as literal `{{var}}`.

## `v-t` directive

`v-t` writes the translation into the element's `textContent` and reacts to locale changes without remounting the element.

```vue
<p v-t="'app.greeting'"></p>

<p v-t="{ path: 'app.greet', data: { name: 'Peter' } }"></p>

<p v-t="{ namespace: 'cart', key: 'items', count: 3 }"></p>
```

The directive is registered globally during `install()`. Opt out per-app via `install(app, { store, directives: false })`; installing with an `Ilingo` instance always registers it. It fills the element after mount, so it renders empty during SSR (see [SSR](#ssr-the-first-render-is-not-a-placeholder)).

## `useScopedCatalog`: per-component message scope

Some components (modals, embedded widgets, marketing sections) carry their own strings. `useScopedCatalog` creates an `Ilingo` instance whose stores resolve scoped messages first, then fall back to the parent app's stores. The scoped instance is provided to descendants; siblings outside the component still see the parent's stores.

```vue
<script setup>
import { useScopedCatalog, useTranslation } from '@ilingo/vue';
import { defineCatalog, defineLocale, defineNamespace, defineTranslations } from 'ilingo';

// Returns { instance, t }. Use `t` inside the same component because
// Vue's provide/inject can't reach the current setup's own provides.
const { t } = useScopedCatalog({
    messages: defineCatalog([
        defineLocale('en', [
            defineNamespace('modal', [
                defineTranslations({ greeting: 'Welcome to the modal!' }),
            ]),
        ]),
    ]),
});

const greeting = t({ namespace: 'modal', key: 'greeting' });
</script>
```

Descendants can use plain `useTranslation`: they get the scoped instance via inject. On unmount, Vue's provides become unreachable and the scoped instance is garbage-collected.

## License

Made with 💚

Published under [MIT License](./LICENSE).
