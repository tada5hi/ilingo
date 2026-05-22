# Plans

Phased roadmap for ilingo, sequenced to land coherent waves of work rather than per-issue churn. The order follows the guidance in umbrella issue [#907](https://github.com/tada5hi/ilingo/issues/907).

| Phase | File                                              | Status      | Tracks                          |
|-------|---------------------------------------------------|-------------|---------------------------------|
| 1     | [001-dependency-cleanup.md](001-dependency-cleanup.md) | Done        | Post-modernization hygiene      |
| 2     | [002-resolution-path.md](002-resolution-path.md)       | In review   | #895, #897, #899                |
| 3     | [003-intl-formatters.md](003-intl-formatters.md)       | In review   | #896                            |
| 4     | [004-type-safe-keys.md](004-type-safe-keys.md)         | Blocked by 2| #898                            |
| 5     | [005-vue-ergonomics.md](005-vue-ergonomics.md)         | Blocked by 2| #900, #901, #902                |
| 6     | [006-dx-and-loader.md](006-dx-and-loader.md)           | Blocked by 5| #903, #904, #905, #906          |

## How to use these

- Each plan file states scope, files to touch, acceptance criteria, and explicit dependencies on prior phases.
- A phase is "done" when every linked issue is closed and the acceptance bullets are checked. Update the file in-place to reflect that.
- If reality diverges from a plan (an issue is split, the design changes), edit the plan rather than letting it rot. Plans are working documents.
- When starting a phase, open one or more PRs that reference the relevant `#NNN` issues so release-please picks up the version-bumping commits per workspace.

## Out of scope

Recorded in #907 and not on the roadmap:

- ICU MessageFormat — covered ~95% by #895 + #896 + #906 without a parser.
- Extraction / unused-key CLI — tooling, not library.
- SSR hydration helpers — framework-specific; add when a concrete consumer needs it.
