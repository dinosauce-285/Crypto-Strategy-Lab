# Orchestration Protocol

How subagents are delegated, how they report, and the contract every one of them obeys.

## Status protocol — every subagent ends with exactly one

| Status | Meaning | Controller action |
| ------ | ------- | ----------------- |
| `DONE` | Completed successfully | Proceed |
| `DONE_WITH_CONCERNS` | Completed, but flagged a concern | Fix if correctness; else proceed |
| `BLOCKED` | Cannot proceed without external action | Add context → simplify → escalate |
| `NEEDS_CONTEXT` | Missing info | Provide exactly what's asked, re-dispatch |

Never ignore `BLOCKED` / `NEEDS_CONTEXT`. Never re-run the same approach after `BLOCKED`.
After 3 failed strikes, escalate to the user. A user-confirmed decision must not be
silently reversed by a later audit.

## Required on every finding / decision

- **`file:line` citation** — `apps/api/src/orders/orders.service.ts:88`, never "orders
  are broken".
- **confidence 0–100** — anything **< 85** must surface as an **Open Question**, never a
  silent choice.

## Reports on disk

Long subagent output → a file under `.claude/plans/<ticket>/reports/<agent>.md` +
a one-line chat summary. The orchestrator reads the file; it never re-dispatches an agent
for work already captured on disk.

## Delegation

- Delegate a self-contained chunk (research, review, a scoped implementation) to the
  matching agent from [`../skill-index.md`](../skill-index.md).
- **Parallel** when the chunks are independent (multiple readers, multiple reviewers).
- **Sequential** when one chunk's output is another's input (plan → implement → review).
- Give each subagent the minimum context it needs, plus this protocol.

## Plan-Clarify loop

`planner` writes a `## Open Questions` section in the plan. The orchestrator surfaces those
via `AskUserQuestion`, records answers under `## Decisions`, and flips the plan frontmatter
`status: draft → confirmed`. No implementation starts until the plan is confirmed.
