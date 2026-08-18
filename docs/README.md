<p align="center">
    <img src="./assets/logo.svg" alt="@ilingo/docs" width="128" height="128" />
</p>

<h1 align="center">@ilingo/docs</h1>

<p align="center">
    <b>The VitePress documentation site for <a href="https://github.com/tada5hi/ilingo">ilingo</a>.</b>
</p>

Private workspace — never published to npm. Deploys to <https://ilingo.tada5hi.net/> via `.github/workflows/docs.yml` on every push to `master`.

## Local development

The Hero component imports `Ilingo` and `MemoryStore` directly from the `ilingo` workspace symlink, which resolves to `packages/ilingo/dist/index.mjs`. The dependent packages must be built **before** the docs dev server or build can resolve them.

From the repo root:

```bash
npm install                  # one-time
npm run build                # build all packages (incl. this site)
npm run dev -w @ilingo/docs  # then start the docs dev server on :5173
```

If you only change docs content (no packages/), subsequent `npm run dev -w @ilingo/docs` runs do not need a rebuild — `dist/` from the first build is still valid.

If you change a package's `src/`, rebuild that package (or the whole repo) before reloading the docs dev server:

```bash
npm run build -w packages/ilingo
```

## Production build

```bash
npm run build -w @ilingo/docs   # writes ./src/.vitepress/dist
npm run preview -w @ilingo/docs # serves the built site on :4173
```

The CI workflow invokes `npm run build` at the repo root, which runs `nx run-many -t build` — nx builds every workspace in topological order, including this one, so a single `npm run build` is enough.

## Structure

- `src/index.md` — landing page. Composes the five marketing components from `src/.vitepress/theme/components/`.
- `src/getting-started/`, `src/guide/`, `src/integrations/` — reference content.
- `src/.vitepress/config.mts` — sidebar / nav / head meta. **Source of truth** for what pages should exist.
- `src/.vitepress/theme/style.css` — `--il-color-*` design tokens (light + `.dark`).

See [`.agents/structure.md`](../.agents/structure.md) for the full file tree.
