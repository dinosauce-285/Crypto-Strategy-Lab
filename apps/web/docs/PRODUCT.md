# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Two audiences, and the interface serves the second one first when a call is close.

Someone watching the market and running experiments: four live charts on different
timeframes, a dataset and a set of strategies chosen, a search started, a leaderboard
read afterwards. Their job is to find out whether a combination of strategies is worth
anything, and to see it without asking the system the same question twice.

An examining panel in a fifteen-minute demo, watching over a projector. Their job is to
judge the architecture, not the returns — so the screen has to make the structure
visible: which dataset is running, which strategies are in the search space, where a
number came from. What they cannot see, they cannot credit.

## Product Purpose

A laboratory for combining crypto trading strategies: plug in analysis methods, combine
them automatically, backtest each combination, score it, rank it, repeat. What is graded
is how few places have to change when a new strategy, a new search algorithm or a new
exchange is added — so the frontend's job is to render what the system decided and never
to decide anything itself. Success is a screen that a stranger can read without a tour.

## Positioning

Not a trading product and not a signal service. It is a bench for comparing combinations
of strategies against each other under one fixed dataset, and the thing it claims that a
charting app cannot is reproducibility: an experiment carries the dataset and the strategy
version that produced it, so a result from three weeks ago can be re-run to the same
number.

## Operating Context

Local development and a demo laptop plugged into a projector. Market data streams from
Binance; the browser never polls, the server pushes. Work arrives as twenty-nine tasks
across six vertical slices, and a slice closes with something clickable rather than with
a layer finished — so every screen has to stand on its own before the next one starts.

## Capabilities and Constraints

Live prices and closed candles arrive over one push channel addressed by topic, and the
same channel later carries leaderboard changes, search progress and loop state.
Strategies are plugged in and combined automatically; each combination is backtested,
scored and ranked.

Constraints that bind the interface: no business calculation in the browser — no profit,
ranking, signal or percentage derived in a component. Colours come from the token file,
never written inline. Every screen produces four states. The push channel does not
redeliver what was missed, so a screen that lost the thread has to say so.

Undecided at the time of writing: the five backtest rules, the overall score formula, and
the charting library (T06). None of them may be invented by a screen.

## Brand Commitments

Precise, quiet, unadvertising — an instrument rather than a trading floor. The numbers are
the subject and everything else recedes.

Two anti-references were made binding:

**A neon crypto exchange.** Purple-to-cyan gradients, blinking figures, badges, the feel
of a casino. It is the nearest trap to this subject and the fastest way to look
untrustworthy about money.

**A beginner investing app.** Oversized green and red, arrows, magnified percentages,
anything that nudges. It turns a laboratory into a game and makes a backtest look like
advice.

## Evidence on Hand

Real Binance market data, live. Real decision records under `docs/decisions/` explaining
why each part is shaped the way it is. No customers, no testimonials, no benchmark
figures, no track record — nothing of that kind exists and none may be invented for a
screen.

## Product Principles

**The number is the subject.** Chrome recedes. If a border, a card or a shadow is not
helping someone read a figure or find a control, it should not be there.

**Show what produced it.** A metric without its dataset and strategy version is not
evidence. Reproducibility is the property being graded, so provenance belongs on the
screen next to the result, not in a tooltip.

**A stale screen must never look live.** The interface says when it is connected, when it
is waiting, and when it has lost the thread. Silence and a quiet market must be
distinguishable.

**Readable from the back of the room.** When a density decision is close, the projector
wins. Fifteen minutes is the whole budget for being understood.

**The browser never computes.** If a number is needed and the API does not return it, the
API is what changes.

## Accessibility & Inclusion

WCAG AA: 4.5:1 for body text and placeholders, 3:1 for large text. Colour never carries
meaning alone — buy and sell, profit and loss, up and down are distinguishable in
greyscale through shape, position or label. Every transition has a
`prefers-reduced-motion: reduce` alternative. One control height per row, one icon family,
and focus is always visible.
