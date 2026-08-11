# Modules talk through an in-process event bus

## Why this

Section 34 lists nine events and shows what they are for: the backtest worker must
not call the leaderboard service directly, it publishes that a strategy was
evaluated and the ranking service listens. Neither module then knows the other
exists. That decoupling is the thing the section is demonstrating, and it is what
question 4 in section 40 is really testing.

Direct function calls would make that impossible to claim honestly. The worker
would hold a reference to the leaderboard, and the report's paragraph about reduced
coupling would be describing something that is not in the code.

An in-process bus gives us the decoupling without adding a service. Nest ships one,
so publishers and subscribers are annotations rather than infrastructure, and the
nine event names become the contract instead of nine method signatures spread
across modules.

The upgrade path is the other half of the reason. When the backtest loop needs
several processes, the transport behind the bus changes and the publishing and
subscribing code does not. Being able to say that — and show the seam it happens at
— is a better answer to "what changes when backtests go from 100 to 100,000" than
any amount of capacity planning.

## What else we looked at

**Direct calls between services** — simplest, and honest for a small system. Here it
costs us the exact property being marked, and section 34 spells out the alternative
it wants to see. It would also mean the ranking service is on the critical path of
every backtest, so a slow ranking step slows the worker.

**An external broker from the start — Redis pub/sub, RabbitMQ, Kafka** — solves a
distribution problem we do not have yet, at the cost of a service to run and to
justify. Section 38 warns that complex technology earns nothing on its own, and at
this stage we would have no driver to point at.

## Trade-offs

An in-process bus dies with the process. Nothing is persisted, nothing is redelivered,
and there is no ordering guarantee beyond what the emitter gives us. That is fine
for UI notifications and ranking updates; it is not fine for anything that must not
be lost, so the backtest queue is deliberately a separate mechanism rather than
being layered on top of the bus.

Events also make control flow harder to follow. Reading the code no longer tells you
who reacts to what — you have to search for the listener. The nine event names being
declared in one place is what keeps that manageable, so that list has to stay
accurate or the decoupling turns into a maze.
