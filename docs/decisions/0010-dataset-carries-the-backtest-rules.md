# A dataset is a record with its own id, and the backtest rules are part of it

## Why this

A leaderboard is only meaningful if the rows on it were produced the same way. Two
things decide that: the data a run used, and the rules it was judged by. Neither can
be left implicit.

The data half is section 33's triple — pair, date range, timeframe. Carrying those as
three loose fields alongside every run means every leaderboard filter compares three
values, and one day it compares two. Nothing errors; a board simply mixes January and
July and goes on looking normal. A `Dataset` row with its own id turns that filter
into one comparison, and an experiment that points at an id cannot half-point at it.

The rules half is the part the brief does not name and the part that is easier to
regret. Whether a position opens at the signal candle's close or the next candle's
open, whether fees are deducted, how many candles are skipped as warm-up, whether
profit is summed or compounded, whether drawdown is measured at close or per candle —
change any one and every number produced before the change stops being comparable
with every number after it. They are as much a part of "how this was judged" as the
date range is.

So they live in the dataset. The consequence is the reason: changing a rule produces a
**new** dataset, with a new id and an empty leaderboard, and every old result stays
valid inside the dataset it was made in. The alternative is not that old results are
wrong — it is that they are wrong and still sitting on the board, indistinguishable
from the new ones, until someone notices months later.

The cost of a new dataset is small because a dataset does not hold candles. Candles
live in their own table keyed by pair, timeframe and time; a dataset names a window
into them. A fee change writes one row, not a re-download.

Without this, whoever takes T12 and T13 has to freeze the rules before the first
search runs, and can never revisit them.

## What else we looked at

**Three loose parameters per run** — no new record and no lookup step before a run.
It fails at the only place it is used: the filter. Three fields compared every time is
three chances to miss one, and the failure is silent by construction.

**A dataset with an id, but the rules kept outside as run-time configuration** — this
is the version most teams end up with, and it keeps the dataset small. It is exactly
the case the decision exists to prevent: a rule lives in a config value, the config
changes, and no row anywhere records that it did. The board then holds two populations
with one identity.

**A separate `RuleSet` id carried alongside the `Dataset` id** — more precise, since
changing the fee does not change which candles were used, and it would let the same
rules be reused across date ranges. Rejected because the leaderboard filter goes back
to comparing two fields instead of one, which is the problem being solved, and because
one cheap row per rule change is not a cost worth a second concept. Worth revisiting
if the number of rule variants ever makes duplicated dataset rows hard to read.

## Trade-offs

The rules have to be settled now, before T12 and T13 are written, by people who have
not yet done that work. A rule chosen badly is not editable in place — it means a new
dataset and re-running what mattered.

The name is now slightly wrong. A dataset holds what the data was *and* how it was
judged, which is two ideas under one word. We accept the imprecision rather than carry
two ids.

Rule changes multiply rows, and a person looking at the list will see several datasets
that differ only in a fee. The UI has to show which dataset a leaderboard belongs to,
or the board becomes confusing in a new way instead of a silent way.

And the guarantee is only as good as the list: any judging rule that is *not* in the
dataset is a rule that can change invisibly. Adding one later means every existing
dataset predates it, with no record of what it was.
