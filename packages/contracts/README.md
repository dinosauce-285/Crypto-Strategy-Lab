# @csl/contracts

Types only. No logic, no dependencies, no runtime behaviour.

Both the API and the web app import from here, so a change to a shape breaks the
build on the side that has not caught up — instead of showing up as `undefined` in
a demo. That is the whole reason this is a package and not two copies of the same
file living in two folders.

What belongs here: the data shapes every module touches, and the names of the
events that travel on the bus. What does not: anything that computes, fetches or
validates against a database.

The shapes below are the minimum needed for the skeleton to compile end to end.
Filling them in properly is task **T02**, and several of them are still waiting on
open decisions — whether a signal carries a strength, what a candidate strategy
looks like, and how a dataset is identified.
