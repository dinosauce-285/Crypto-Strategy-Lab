# Features are planned in OpenSpec, and the reasoning still lives in docs/decisions/

## Why this

A task card says what "done" means. A decision record says why a choice went one way.
Between those two there is a gap nobody was filling: what exactly is being built, in
what order, and what the system is able to do once it is finished.

Until now that gap lived in whoever was holding the task in their head, and in
`.claude/plans/`, which is gitignored and per-person by design. It does not survive
the session, and it certainly does not survive being handed to someone else.

OpenSpec fills it with three committed artefacts per change — a proposal, a task
checklist, and a spec describing the capability afterwards. The third one is the part
with no equivalent here. We have twenty-nine rows describing *work*, and sixteen
records describing *decisions*, and nothing describing what the system does. Section
45 asks for exactly that at hand-in, and the breakdown warns that writing slice 5 from
memory at the end is how it goes wrong. Specs that accrete as each slice closes are
the cheap version of that document.

Now is when it costs least. Slice 0 is closed and every remaining slice is feature
work, so adopting it here means the specs are written as we go rather than
reconstructed in the last week.

**The half that matters more than the tool: there is still one home for reasoning.**

OpenSpec's stock workflow generates a `design.md` per change, and this repo already has
`docs/decisions/`. Both answer "why did we choose this". Two homes for one job is the
second pattern that `development-rules.md` refuses, and here it would split the very
artefact section 45 marks — half the argument in an ADR, half in a change folder,
neither complete.

So the change folder does not get one. The project schema is `proposal → specs →
tasks`, and the three answer different questions: a spec says what the system does, a
record says why that was chosen, a task says what to do next. What would have gone into
`design.md` splits along the same line — a choice big enough to argue is a record, and
everything smaller is a task, written concretely enough that nobody re-derives it.

The seam between a change and a record is mechanical rather than remembered, because
remembering is what fails in week nine:

- The proposal has a **Decisions** section of two lines. *Settled* links the records the
  change builds on; *To settle* names the choice it owes one, or says there is none. It
  links and never restates, so the argument exists once.
- Group 0 of every task list is writing that record, ordered before the code that
  assumes it. `pnpm decision "<the choice>"` takes the next number, writes the three
  headings and adds the index line, so the clerical half stops being a reason to skip it.
- `pnpm decision --check` runs on commit and refuses a record with an empty section or
  one missing from the index. The pre-push gate still refuses a push touching
  `packages/contracts/src`, `schema.prisma`, `prisma.config.ts` or a `*.module.ts` with
  no record beside it — but group 0 has normally caught it a day earlier, which is the
  point. A gate is a bad place to learn that a decision needed writing down.

`openspec/` is committed; the generated skills under `.claude/` are not, exactly like
every other harness file — `AGENTS.md` already permits a local harness to add skills,
and a spec only the author can read is a note to self.

## What else we looked at

**Nothing — keep the card, the ADR and the code.** It is what carried slice 0, it has no
learning curve and no dependency, and for a five-person term project that is a serious
argument. It loses on the one thing that is marked: the Architecture Document gets
written at the end from memory, and by then the reasons have gone soft. This was the
closest call.

**OpenSpec local-only, `openspec/` gitignored.** No widening of the shared contract, no
record needed, and the tool still helps whoever installed it. It also turns a spec into a
private note, which removes most of what a spec is for.

**Lean harder on `.claude/plans/`.** It already exists and is already where the `planner`
agent writes. It is gitignored and per-person on purpose, and its shape is whatever the
agent produced that day, so nothing accumulates.

**Hand-written specs under `docs/`.** No dependency, no CLI, complete control of the
format. Nothing then keeps a spec in step with the change that altered it, and the
archive step is precisely the part that does that.

## Trade-offs

Every feature now carries up to three artefacts — a card, a change folder, sometimes an
ADR. For a small task that is more ceremony than the task, and the temptation will be to
skip the change folder for exactly the tasks where the record would have been cheapest.

The line between a record and a task is a judgement made per point, and getting it wrong
is invisible: a task that should have been a record simply never gets marked. The
pre-push gate catches the cases that touch contracts, schema or module wiring, and
nothing catches the rest.

`pnpm decision` takes the next number by reading the folder, so two branches writing a
record in the same week both take it. Nothing notices until they meet on `dev`, and then
somebody renames a file other records already link to.

`openspec/` widens the shared contract that `docs/agent-harness.md` deliberately keeps
small. A second tool now has a say in how work is described, and if it is abandoned
later the folder is left behind looking authoritative.

The generated skills live under `.claude/`, which is gitignored, so every teammate runs
`openspec init` themselves. Two things then bite each of them: OpenSpec writes a nested
`metadata:` block that the repo's frontmatter parser rejected until we widened it — and
that fix is also under `.claude/`, also not in git. And telemetry is on by default, stored
in `~/.config/openspec` rather than in the repo, so opting out is per-machine too. Both
belong in the setup instructions or they will be discovered one teammate at a time.

The tool is at `^1.9.0` and regenerates its own skill files on update, so a minor release
can change the frontmatter shape our parser now accepts. That is a dependency on someone
else's format, taken for a convenience rather than for a requirement.
