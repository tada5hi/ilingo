# Phase 5 — Vue ergonomics

**Status**: Done.
**Tracks**: [#900](https://github.com/tada5hi/ilingo/issues/900), [#901](https://github.com/tada5hi/ilingo/issues/901), [#902](https://github.com/tada5hi/ilingo/issues/902).

Brings `@ilingo/vue` to feature parity with vue-i18n's most-used Vue surface: component interpolation, the `v-t` directive, and scoped catalogs.

## Scope

### #900 — Component interpolation (`<ITranslateT>`)

- New SFC that renders a translation containing `{slot}` placeholders, where each placeholder is filled by a named Vue slot. Equivalent of vue-i18n's `<i18n-t>`.
- Reuses the existing template parser; teach it to emit `{ kind: 'slot', name }` tokens in addition to `{ kind: 'var', name }`.
- The renderer assembles a `h('span', [...children])` where each child is either a text node or the resolved slot's vnodes.

### #901 — `v-t` directive

- Thin wrapper that calls `useTranslation` under the hood and writes the result to `el.textContent`. Reactive to `locale` changes.
- Binding shape: `v-t="'app.greeting'"` (string) or `v-t="{ group: 'app', key: 'greeting', data: { ... } }"` (object).
- Register globally in `install()`; opt-out via `Options.directives = false`.

### #902 — Scoped per-component message catalogs

- `useTranslation({ messages: { en: { ... } }, ...ctx })` — when `messages` is present, prepend an ephemeral `MemoryStore` to a *cloned* `Ilingo` instance scoped to the component's lifetime.
- The cloned instance is provided to the component's subtree via the same provide/inject keys; siblings outside the component see the unscoped instance.
- `onUnmounted` releases the scoped instance — no leak.

## Files touched

- `packages/vue/src/component-t.vue` (**new**) — `<ITranslateT>`.
- `packages/vue/src/directives/v-t.ts` (**new**) — directive factory.
- `packages/vue/src/composables/use-translation.ts` — add `messages` option, scoped-instance handling.
- `packages/vue/src/composables/instance.ts` — provide-key plumbing for the scoped instance.
- `packages/vue/src/index.ts` — re-export `<ITranslateT>`, register `v-t` in `install()`.
- `packages/ilingo/src/utils/template.ts` — slot token type (shared with Phase 3's modifier parser; coordinate the AST).

## Acceptance

- [x] `<ITranslateT path="app.welcome"><template #cta><strong>get started</strong></template></ITranslateT>` renders the strong inline. Asserted in `component-t.spec.ts` (`mixes vars and slots in a single message`).
- [x] `v-t` reactively updates when the injected locale Ref changes — element identity preserved (no remount). Asserted in `directive-t.spec.ts` (`reactively updates when the injected locale Ref changes — without remounting`).
- [x] Scoped messages added in a `<Modal>` do not leak to a sibling component. Asserted in `scoped-catalog.spec.ts` (`does not leak the scoped messages to a sibling component`).
- [x] `useScopedCatalog` returns `{ instance, t }` for same-component use because Vue's provide/inject can't reach the current setup's own provides — the descendant path uses plain `useTranslation`. Both paths covered by tests.
- [x] `Options.directives: false` opts out of `v-t` registration. Covered.

## Design notes (recorded during implementation)

- The template tokenizer lives in **core** (`packages/ilingo/src/utils/template.ts`) so non-Vue renderers (e.g. a future React adapter) can reuse it. Plain `template()` continues to return a string for `Ilingo.format`; `tokenize()` is a parallel parser for VNode-producing renderers.
- `<ITranslateT>` is a `.ts` render-function component (no `.vue` SFC) — interleaving text/VNode children is more direct in a render function than in template syntax.
- The `v-t` directive captures the `Ilingo` instance and locale `Ref` at install-time via a `createVTDirective(instance, localeRef)` factory. The closure means directive lifecycle hooks (which run outside setup) can still reach the orchestrator.
- A `Symbol.for('ilingo.v-t.stop')` is stashed on the element to hold the `watchEffect` stop-handle, so re-bindings and unmounts can cancel the effect cleanly.
- `useScopedCatalog` could not be wired to mutate the current component's own injection — Vue's API doesn't expose that. Returning a same-component `t` shorthand is the pragmatic alternative and matches vue-i18n's `useI18n` pattern.

## Follow-up out of scope

- Catalog-aware generics in the Vue composables (`useTranslation<typeof catalog>(...)`, `<ITranslateT<typeof catalog>>`). Phase 4 left this for later because the Vue side needs either module augmentation (`declare module '@ilingo/vue' { interface IlingoCatalog { ... } }`) or per-call generics, both of which deserve their own design pass.

## Why this order

The Vue surface depends on `onMissingKey` (Phase 2) being callable from inside the composable, and benefits from the generic catalog (Phase 4) so `<ITranslateT path="...">` autocompletes the path. Land it after both.
