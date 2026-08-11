# Backtests run through BullMQ on Redis

## Why this

Section 43 does the arithmetic: 10,000 candidates at two seconds each is 20,000
seconds on a single worker. That alone argues for parallelism, but speed is the
smaller half of the reason.

Section 24 requires that workers run in parallel, retry after a failure, and be
paused and resumed. Section 23 requires an explicit stop condition. Section 32.7
asks how many jobs failed and how long a backtest takes. Those are four separate
pieces of behaviour, and BullMQ ships all of them — retries with backoff, pause and
resume on the queue, and counters we can read straight into the monitoring page in
T21. Writing them by hand on top of an in-memory queue is more work than adding
Redis, and the hand-written version is the one that will have bugs.

Redis is defensible here in a way it would not be elsewhere in this project,
because there is a driver to point at rather than a preference. That matters given
section 38's warning about technology added without justification.

## What else we looked at

**In-memory queue with worker threads** — no extra service, and enough to get the
loop running. Bounded to one process, loses everything in flight on restart, and
every one of the four behaviours above has to be written from scratch. It would be
the right choice if the loop were a nice-to-have; the brief makes it module 9.

**RabbitMQ or Kafka** — more capable than we will ever exercise. The cost is not
just running them, it is having to answer what architectural problem they solve
that BullMQ does not, and here there is no honest answer.

## Trade-offs

A job has to be serialisable, so a candidate strategy must be data rather than a
live object. That is a constraint on the shared types, and it has to be accepted
when those are defined rather than discovered when the second worker starts.

The project no longer runs with a single command. Every teammate and every demo
machine needs Redis up, which pushes weight onto the setup instructions and gives
the demo one more thing that can be broken on the day.

Two queues now exist in the system in a loose sense — the event bus for
notifications and BullMQ for work. Keeping the line between them clear is on us:
anything that must not be lost goes through BullMQ, anything cosmetic goes through
the bus.
