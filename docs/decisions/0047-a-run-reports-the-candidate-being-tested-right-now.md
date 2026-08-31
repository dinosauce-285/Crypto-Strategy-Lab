# A run reports the candidate being tested right now

## Why this

Section 46 step 4 describes what the screen shows while a search is running, and it is three
lines: how many candidates have been tested, which one is being tested now, and that a
backtest is in progress. The panel had the first and nothing else. `RunStatus` carried
counters and a best-so-far, and no field named the candidate a worker was holding, so the
screen could not have shown it however it was written.

The missing line is the one that makes the other two mean something. `Đã thử 125` with a
frozen strategy list beside it reads the same whether the loop is working or wedged — it is a
number that was true at some point. Naming the candidate in flight is what turns a status
panel into evidence that the machine is alive, and it is the difference section 32.7 is
asking about when it asks whether the loop is running.

So `RunStatus` gains `current`, holding the specification and its hash. It sits on
`RunStatus` beside `state` rather than inside `counters`, because `counters` answers the five
questions of section 32.7 and this is not one of them: it is not a count, it is what the run
is doing at this instant, which is what `state` is for.

It carries the whole `CandidateSpec` rather than a rendered string. The panel needs member
ids and their parameters to write `MA20 + RSI14 + SR`, the spec is already in memory as the
pending entry the job was queued with, and a label composed on the server would be a second
place that decides how a candidate is named — the leaderboard already has the first.

Several workers may be testing at once, so `current` is the most recently started of them
rather than the only one. That is a simplification and it is stated in the contract, because
the alternative reads as a lie to anyone running three workers.

## What else we looked at

**Derive it in the browser from the events already published** — `BacktestStarted` carries a
`specHash` and crosses the channel today, so the panel could hold the last one it saw. It
fails on arrival: a screen opened mid-run has seen no events and would show nothing until the
next candidate starts, and a reconnect resets it. Status is a thing you can ask for; an event
stream is a thing you can miss the start of, and section 46 step 4 describes what a screen
shows, not what it accumulated.

**Send only the `specHash`** — smaller, and the browser already shortens hashes elsewhere.
`hash: a3f9c1b2` is not what section 46 asks for, and a hash names a candidate only to
somebody holding the table it came from. The point of the line is that a person reading it
recognises the combination.

**Send a finished label like `"MA20 + RSI14 + SR"`** — exactly what the screen needs, no
composition in the browser. It puts naming on the server, where the leaderboard's naming is
not, so the same candidate would be described by two pieces of code that will drift. It also
freezes the format: a UI that later wants the parameters in a tooltip has to change a
contract to get them.

**Add a `substate` field for "backtesting"** — the third line of section 46 step 4, spelled
out. It is already implied: `state === 'running'` with a `current` present is what
backtesting means, and a field that can be derived from two others is a field that can
disagree with them.

## Trade-offs

`RunStatus` is published on every queue event, and `current` makes each of those messages
carry a full specification rather than a handful of numbers. For a run at the queue depth
this is a few hundred bytes several times a second — nothing here, and the first thing to
reconsider if the panel is ever pointed at a run with many workers.

`current` is the last candidate to start, and with several workers the screen will name one
of several while implying it is the one. A user watching a three-worker run sees a name that
changes faster than candidates complete and does not correspond to what finishes next. The
contract says so, but a contract comment is not on the screen.

The field is optional and absent between candidates, so the line it feeds appears and
disappears as jobs turn over. A panel that renders it naively will flicker, and the fix is
presentation — hold the last value while the run is still running — which means the browser
now keeps a small piece of state the server also has.
