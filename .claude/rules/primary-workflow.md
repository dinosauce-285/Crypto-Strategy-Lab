# Primary workflow

```
Read the task row  ->  [Plan]  ->  Implement  ->  Verify it runs  ->  Record  ->  Commit
```

**Read the task row.** Tasks are `T01`…`T29` in `docs/project-breakdown.html`. The row
tells you what "done" means, which part of the brief demands it, and what is left open.

**Plan** for anything touching more than one module, or anything that shapes a contract.
Use the `planner` agent. Skip it for a one-file change.

**Implement** inside the slice you are in. Work is cut into six vertical slices and a
slice closes with something clickable — do not start the next one until it does.

**Verify it runs.** Building is not verifying. Call the endpoint, open the screen.

**Record.** If a contract moved, `docs/decisions/` gets a file in this change.

**Commit** with `pnpm commit`. Branch per task, named after the ID: `T11-strategy-registry`.
The commit scope defaults to the branch, so the message comes out right on its own.

## Delegating

| Agent | Use for |
| --- | --- |
| `planner` | research and a plan before a non-trivial change |
| `codebase-analyst` | map what exists before touching an unfamiliar area |
| `code-reviewer` | review before merge |
| `code-simplifier` | cut a change back after it works |
| `debugger` | a failure whose cause is not obvious |
| `researcher` | an external question — a library, an API, a protocol |
| `security-reviewer` | anything touching secrets, auth, or external input |
| `test-runner` | run and interpret the suite |

Every delegated agent ends with `DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT`
and cites `file:line` for each finding. See `orchestration-protocol.md`.
