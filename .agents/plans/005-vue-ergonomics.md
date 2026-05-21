# Phase 5 — Vue ergonomics

**Status**: Blocked by Phase 2 (uses fallback + missing-key handler) and ideally Phase 4 (so composables can be generic in the catalog).
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

- [ ] `<ITranslateT path="app.welcome"><template #user><strong>Peter</strong></template></ITranslateT>` renders the strong inline.
- [ ] `v-t` updates the DOM when `setLocale()` is called, without remounting the element.
- [ ] Scoped messages added in a `<Modal>` do not leak to the surrounding page after the modal unmounts (asserted via `injectIlingo` reading back).

## Why this order

The Vue surface depends on `onMissingKey` (Phase 2) being callable from inside the composable, and benefits from the generic catalog (Phase 4) so `<ITranslateT path="...">` autocompletes the path. Land it after both.
