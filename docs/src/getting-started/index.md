# Introduction

**ilingo** is a small, framework-agnostic translation and internationalization library for TypeScript. It gives you four things and nothing more:

1. An **orchestrator** (`Ilingo`) that resolves a key against a locale chain.
2. A **port** (`IStore`) with two stock adapters: in-memory and file-system.
3. A **template** engine for `{{var}}` substitution plus `Intl` formatters.
4. An optional **typed-catalog** mode that turns typos into compile errors.

Everything else — pluralization, fallback chains, missing-key handling, framework adapters — composes from those four pieces.

## Why ilingo?

- **Tiny.** The core has two runtime dependencies. ESM-only, browser-safe, no `node:` imports in the core.
- **Pluggable.** A custom store is one class implementing three methods.
- **Locale-first resolution.** A `pt-BR` request walks `pt-BR → pt → en` before giving up — and the closest locale wins regardless of which store holds it.
- **Standards-aligned.** Plurals go through `Intl.PluralRules`. Formatters delegate to `Intl.NumberFormat`, `Intl.DateTimeFormat`, `Intl.ListFormat`.
- **Type-safe when you want.** Drop in `defineCatalog()` and the compiler enforces every namespace, key, and `count`.

## Where to go next

- **[Installation](./installation)** — install the packages you need.
- **[Quick Start](./quick-start)** — a 30-second example.
- **[Guide → Overview](/guide/)** — the conceptual map.
- **[Integrations](/integrations/)** — file system, Vue, Vuelidate.
