# Skill & Agent Index

Auto-generated picker tables. Do not edit between the markers — run
`node .claude/scripts/regen-skill-index.cjs` instead.

<!-- skills:start -->

### Skills — load the matching skill BEFORE implementing

| Skill | When to load |
| ----- | ------------ |
| add-strategy | Adding any new strategy — MA, MACD, SMC, Wyckoff, sentiment, anything that emits BUY/SELL/HOLD. |
| impeccable | Use when the user wants to design, redesign, shape, critique, audit, polish, clarify, distill, harden, optimize, adapt, animate, colorize, extract, or otherwise improve a frontend interface — websites, landing pages, dashboards, product UI, components, forms, onboarding, empty states. Covers UX review, hierarchy, a11y, responsive, theming, typography, spacing, layout, color, motion, UX copy, design systems/tokens, and live browser iteration. Not for backend-only or non-UI tasks. |

### Agents

| Agent | Use for |
| ----- | ------- |
| code-reviewer | Two-pass review of a diff for quality, correctness, and adherence to the constraint docs. Use immediately after writing or modifying code, before merge. |
| code-simplifier | The [Simplify] stage — cut speculative code and premature abstractions from a diff without changing behavior. Use after implementation, before review. |
| codebase-analyst | Map an unfamiliar area of the codebase — where a feature lives, how a flow works, which files a change touches. Use at the start of a Large task to build a file map. |
| debugger | Root-cause a failing test, error, or unexpected behavior and propose the minimal fix. Use when something is broken and the cause is not obvious. |
| planner | Research and lock an implementation plan before code is written. Use for non-trivial features, multi-app changes, or schema changes. |
| researcher | Focused technical research — API behavior, library usage, or how an existing subsystem works — returning a cited summary. Use before planning or when a fact is unknown. |
| security-reviewer | Security review of code touching auth, user input, DB queries, file paths, external calls, or secrets. Use before committing security-sensitive changes. |
| test-runner | Run the relevant test suites for touched apps and report failures with root cause. Use during the Test stage or when verifying a fix. |

<!-- skills:end -->
