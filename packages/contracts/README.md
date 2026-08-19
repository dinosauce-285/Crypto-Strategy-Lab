# @csl/contracts

Types only. No logic, no dependencies, no runtime behaviour.

Both the API and the web app import from here, so a change to a shape breaks the
build on the side that has not caught up — instead of showing up as `undefined` in
a demo. That is the whole reason this is a package and not two copies of the same
file living in two folders.

What belongs here: the data shapes every module touches, and the names and payloads
of the events that travel on the bus. What does not: anything that computes, fetches
or validates against a database.

## The shapes

`market` candles and timeframes · `signal` what a strategy answers · `strategy` how
a strategy describes itself and what it is allowed to see · `candidate` a combination
as it travels · `dataset` what a run was measured against · `experiment` trades,
metrics and the recorded run · `news` articles and their classification · `events`
the nine names and what each carries.

## Two things that live outside this package

**Hashing.** `CandidateMember.paramsHash` and `Experiment.specHash` are fields here
but computing them is not: member order, key order, weight normalisation and float
precision have to be settled first, and that is code. It belongs to whoever writes the
search engine, in one place, because two implementations that disagree would hand the
same candidate two identities and test it twice.

**Validation.** A specification arriving from the queue is untyped at runtime, and
asserting a type onto it checks nothing. The validator that actually checks it lives
in the API and has to be kept in step with these shapes by hand. Three of the rules it
enforces cannot be expressed as types: weights above zero, weights on a grid of 0.1,
and weights summing to 1 across a specification.

## What is still open

`BacktestRules` fixes the shape, not the numbers. Which entry price, what fee, how
much warm-up, summed or compounded, drawdown at close or per candle — those are a
team decision, and by `0010` they are chosen once before the first dataset exists.
Nothing in this package waits on them; T12 does.
