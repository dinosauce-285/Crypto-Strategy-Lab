# Every strategy describes itself, and three parts of the system read that description

## Why this

Three places need to know what a strategy is before anyone can use it: the parameter
form in T14, the search space in T17, and the selection list in T20. They can learn it
in one of two ways — someone types the answer into all three, or the strategy says it
once and they read it.

Typing it into all three is the hard-coded strategy the brief lists among the design
faults in section 44, and it is what section 41 is written to expose: adding a
Support/Resistance strategy would mean editing a form, a search space and a list, and
the scenario would find all three inside a minute.

So a strategy declares itself:

```
id, name, group, params[]
```

alongside what earlier decisions already put in the same place — the warm-up length
from `0006`, the data needs from `0008`, the code version from `0009`. Four records now
ride on one declaration, which is the argument for it being one declaration rather than
four conventions.

A parameter is described as `{ name, type, min, max, step, default }`. The form needs
`type` and `default` to render a control; the search engine needs `min`, `max` and
`step` to enumerate a space at all — section 15's example of MA at 10/20, 20/50, 50/200
is exactly a range walked by a step. Leaving the range out would mean the search engine
inventing bounds for parameters it knows nothing about.

`group` is one of Trend, Momentum, Volatility, Structure, Information — the five
functional groups of section 17. It is in the declaration because the domain-guided
search of T17 is defined in terms of it: *one trend strategy plus one momentum strategy
plus one structure strategy* is a rule that cannot be expressed without the field, and
inferring it from a strategy's name is guessing.

## What else we looked at

**Hard-coded lists in each screen** — no mechanism to build. It is listed here mainly
to record that we considered it and know where it breaks, because a record that never
names the obvious option reads as though the obvious option was never seen.

**Metadata in a separate config file or database table** — keeps the class small, and
lets ranges be tuned without touching code. Rejected because it creates two things that
must agree with nothing holding them together: the file says `period` runs 2 to 50, the
code renamed the parameter last week, and neither the compiler nor a test notices. On
the class, the declaration sits beside the code it describes and travels with it.

**Deriving the parameter list from the constructor by reflection** — the version with no
duplication at all. TypeScript erases types at run time, so it needs decorators to
survive, and the parts that matter most here — a range and a step — are not expressible
as types in the first place.

## Trade-offs

A wrong declaration fails silently. Declare `min: 2, max: 50` for an indicator whose
code needs at least 14 candles and the form happily offers 3, the search engine spends
draws on candidates that cannot produce a signal, and nothing anywhere complains. This
is the same class of failure `0008` accepts for data needs, and it has the same partial
answer: the strategy's golden test only covers the values the fixture uses.

The parameters now appear twice — once in the declaration, once where the code reads
them — which is the duplication `0008` already accepted for the data a strategy needs.
It is the price of self-description, paid a second time.

The ranges are guesses when they are first written, and the quality of the search space
depends on them more than on the search algorithm. Nobody will know whether they were
good bounds until candidates have been scored, and by then they are baked into the
experiments already run.
