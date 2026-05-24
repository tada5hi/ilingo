# Plans

Two umbrella roadmaps have driven this project:

1. **Feature parity with i18next / vue-i18n** — umbrella issue [#907](https://github.com/tada5hi/ilingo/issues/907), now closed. Phases 1–6 below covered it.
2. **Roadmap to a stable ilingo** — umbrella issue [#917](https://github.com/tada5hi/ilingo/issues/917), the current target. Phase 7+ below.

Each phase file states scope, files to touch, acceptance criteria, and explicit dependencies on prior phases. A phase is "done" when every linked issue is closed and the acceptance bullets are checked.

## Phases (umbrella #907 — feature parity)

| Phase | File                                              | Status | Tracks                          |
|-------|---------------------------------------------------|--------|---------------------------------|
| 1     | [001-dependency-cleanup.md](001-dependency-cleanup.md) | Done   | Post-modernization hygiene      |
| 2     | [002-resolution-path.md](002-resolution-path.md)       | Done   | #895, #897, #899                |
| 3     | [003-intl-formatters.md](003-intl-formatters.md)       | Done   | #896                            |
| 4     | [004-type-safe-keys.md](004-type-safe-keys.md)         | Done   | #898                            |
| 5     | [005-vue-ergonomics.md](005-vue-ergonomics.md)         | Done   | #900, #901, #902                |
| 6A    | [006-dx-and-loader.md](006-dx-and-loader.md) (#905, #906) | Done   | locale negotiation + custom formatters |
| 6B    | [006-dx-and-loader.md](006-dx-and-loader.md) (#903, #904) | Done   | loader store + FSStore watch mode      |

## Phases (umbrella #917 — stability roadmap)

| Phase | File                                              | Status      | Track |
|-------|---------------------------------------------------|-------------|-------|
| 7     | [007-stability-roadmap.md](007-stability-roadmap.md) | In progress | Index for tracks B–F of [#917](https://github.com/tada5hi/ilingo/issues/917). Track A was completed by phases 1–6. |

## How to use these

- A phase is "done" when every linked issue is closed and the acceptance bullets are checked. Update the file in-place to reflect that.
- If reality diverges from a plan (an issue is split, the design changes), edit the plan rather than letting it rot. Plans are working documents.
- When starting a phase, open one or more PRs that reference the relevant `#NNN` issues so release-please picks up the version-bumping commits per workspace.

## Out of scope (as decided)

Recorded in the umbrella issues and not on the roadmap:

- **ICU MessageFormat** — covered ~95% by #895 + #896 + #906 without a parser.
- **Extraction / unused-key CLI** — tooling, not library. May be revisited post-stable.
- **SSR hydration helpers** — framework-specific (Nuxt has its own pattern; Express renders on demand). Add when a concrete consumer needs it. Cookbook page is in Track C scope.
