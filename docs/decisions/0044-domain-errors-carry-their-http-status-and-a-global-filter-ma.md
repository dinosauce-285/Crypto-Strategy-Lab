# Domain errors carry their HTTP status and a global filter maps them

## Why this

The API had two ways of answering a bad request and no rule for choosing between them.
`market.controller.ts` and `news.controller.ts` check their input closely and raise
`BadRequestException` by hand. `search.controller.ts` wraps its calls in a `try/catch` and
maps three domain errors to three status codes. `leaderboard.controller.ts` and the dataset
creation endpoint check nothing at all. Nothing in the codebase said which of these was the
house style, so each new endpoint picked one, and the quality of the answer a caller gets
depends on which endpoint they happened to call.

The cost is not evenly spread. `spec-validator.ts` writes genuinely useful refusals —
`member ma has a weight outside (0,1] on the 0.1 grid`, `member weights sum to 0, not 1` —
and throws them as `InvalidSpecError`. No controller catches that, so Nest returns `500
Internal server error` with an empty body. The diagnosis is produced and then discarded at
the exact moment it is worth something.

So: an error that a caller can provoke declares the status it deserves, and one filter
turns it into that response. `DomainError` is an abstract class with an abstract `status`;
every such error extends it. The filter imports that base class and nothing else, so a
cross-cutting file never reaches into a module and the dependency direction stays one-way.

Putting the status on the error rather than in a table inside the filter is the part doing
the work. The person who adds an error is the person who knows what it means, and they are
already in the file. If saying so requires opening a second file, it will be skipped, and a
skipped entry is a 500 — the failure this record exists to remove, returning through the
mechanism meant to prevent it. A status that lives next to the message is also read by
whoever changes the message, which is when the two most often stop agreeing.

## What else we looked at

**Nest's global `ValidationPipe` with `class-validator` DTOs** — the framework's own
answer, the one the audit names, and the first thing a reviewer will ask about. It costs
two dependencies and, more expensively, request shapes rewritten as classes carrying
decorators. Those shapes already exist as types in `@csl/contracts`, imported by both apps;
a decorated class is a second copy of something the contracts package owns, and two copies
drift the first time one is edited. The rules already in force do not survive the move
either: `from` and `to` must be supplied together or not at all, `strategyRefs` is
de-duplicated by `id@version`, a weight must land on the 0.1 grid. None is a decorator
without a custom validator behind it. What is actually on offer is `class-validator`
handling the easy half of validation and the existing parse functions handling the hard
half, and a reader having to learn which half lives where. That is one more paradigm than
the problem has.

**A mapping table inside the filter** — `InvalidSpecError → 400`, `QueueUnavailableError →
503`, written in one readable block. It reads well and it inverts the dependency: the
cross-cutting file would import from `search/`, `market/`, `news/`, so the one file that
must not know about modules would know about all of them. `BACKEND_CONSTRAINT.md` calls
that layering only points one way, and this would point it both.

**Extending `HttpException` directly in the domain code** — shortest path by far, since
Nest already renders those correctly with no filter at all. It puts `@nestjs/common` inside
validators and services, which is the layer that is supposed to survive the framework being
replaced. A validator that imports HTTP vocabulary is a validator that cannot be reused by
the queue worker, which has no HTTP.

**Leave the `try/catch` in each controller and simply add the missing ones** — no new
concept, nothing to learn, and it is exactly the status quo that produced the drift. It is
N places to keep right instead of one, and every new error means revisiting every
controller that can raise it. The endpoints that check nothing today are not the product of
a decision anyone would defend; they are the product of this being the cheapest thing to
skip.

## Trade-offs

Domain code now names an HTTP status, and HTTP is a transport concern one layer below where
it now appears. What bounds the leak is that it is a number and not a framework: a
`DomainError` subclass holds `409`, not a Nest import, so the queue worker can raise the
same error and ignore the field. It is still a leak, and someone will eventually argue it
should have been an abstract kind — `conflict`, `not-found` — mapped to numbers at the
edge. That indirection buys nothing today, when there is exactly one edge.

Anything that does not extend `DomainError` still becomes a 500, and that is deliberate.
The parse functions throw `TypeError`, and so does every real bug — `undefined.foo` is a
`TypeError` too. A filter that turned every `TypeError` into a 400 would hand the caller a
plausible message for a fault that is ours, and drop it out of the logs where a 500 belongs.
The cost is that each parse function still needs its refusal translated at the boundary
until it raises a `DomainError` of its own.

One filter is one place every error passes through, so when it is wrong it is wrong
everywhere at once, and the blast radius of a bad edit there is the whole API. That is the
same property that makes it worth having.

The message on a `DomainError` is now the message the caller reads. It was already true of
the hand-written `BadRequestException` calls, but it was true of five of them; it is now
true of every error in the set, which makes those strings a surface that changes behaviour
for whoever is parsing them, and someone eventually will be.
