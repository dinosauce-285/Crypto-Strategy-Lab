# Crypto Strategy Lab — Claude Code entry

The architecture, rules and conventions live in **[`AGENTS.md`](AGENTS.md). Read it first.**
This file adds only the tool-specific machinery.

## Nested instructions — read before touching that folder

| Folder | File |
| --- | --- |
| `apps/api` | [`apps/api/CLAUDE.md`](apps/api/CLAUDE.md) |
| `apps/web` | [`apps/web/CLAUDE.md`](apps/web/CLAUDE.md) |

## Rules loaded per task

| Rule | Read when |
| --- | --- |
| `.claude/rules/primary-workflow.md` | starting any task |
| `.claude/rules/development-rules.md` | before writing code |
| `.claude/rules/orchestration-protocol.md` | before delegating to a subagent |

## Skill and agent pickers

Generated from frontmatter — see [`.claude/skill-index.md`](.claude/skill-index.md).
`pnpm quality` fails if that file has drifted, so it cannot rot.

| Skill | When to load |
| --- | --- |
| `impeccable` | any frontend work: a screen, a component, tokens, layout, a chart's look |
| `add-strategy` | adding any new strategy — the section 41 rehearsal |

## Hooks

Wired across eight lifecycle events. Each has an env off switch; turning one off is a
decision, so say so in the commit message.

| Hook | Event | Does | Off switch |
| --- | --- | --- | --- |
| `session-start` | SessionStart | open decisions, `.env` drift, secret leaked into web env | `HOOK_SESSION_START=0` |
| `user-prompt-submit` | UserPromptSubmit | spots a task id, points at its row and the branch name | `HOOK_USER_PROMPT=0` |
| `dev-rules-reminder` | UserPromptSubmit | re-states the discipline every ~10 prompts | `HOOK_DEV_RULES=0` |
| `scout-block` | PreToolUse | blocks reads into `node_modules`, `dist`, `generated` | `HOOK_SCOUT_BLOCK=0` |
| `bash-security-guard` | PreToolUse | blocks dangerous shell | `HOOK_BASH_SECURITY=0` |
| `auto-format` | PostToolUse | formats what was just written | `HOOK_AUTO_FORMAT=0` |
| `decision-reminder` | PostToolUse | nudges when a contract file changes | `HOOK_DECISION_REMINDER=0` |
| `descriptive-name` | PostToolUse | flags vague file names | `HOOK_DESCRIPTIVE_NAME=0` |
| `subagent-init` | SubagentStart | injects the status/citation contract | `HOOK_SUBAGENT_INIT=0` |
| `subagent-verify` | SubagentStop | warns on fabricated tool calls | `HOOK_SUBAGENT_VERIFY=0` |
| `pre-compact` | PreCompact | checkpoints branch and working tree | `HOOK_PRE_COMPACT=0` |
| `stop-notify` | Stop | signals the turn finished | `HOOK_STOP_NOTIFY=0` |

## Git gates

Versioned in `.githooks/`, enabled automatically on `pnpm install`.

**pre-commit** — refuses a staged secret; validates `.claude` frontmatter and that
`skill-index.md` is in sync; lints and typechecks only the packages that changed.

**pre-push** — full build and tests, plus the **decision gate**: a change touching
`packages/contracts/src/`, `schema.prisma`, `prisma.config.ts` or any `*.module.ts` with no
file under `docs/decisions/` in the same push is refused, with an explanation of why.

Escape hatch for both: `SKIP_GATE=1 git commit` / `SKIP_GATE=1 git push`.

## Keeping the config honest

```
pnpm quality    validate frontmatter, check the index is in sync, find orphans, lint, build
node .claude/scripts/regen-skill-index.cjs    regenerate the picker tables above
```

## Commands

```
pnpm dev        API :3001 + web :5173
pnpm build      contracts -> api -> web
pnpm lint       both apps
pnpm commit     guided conventional commit — use instead of git commit
pnpm db:generate  regenerate the Prisma client after a schema change
```
