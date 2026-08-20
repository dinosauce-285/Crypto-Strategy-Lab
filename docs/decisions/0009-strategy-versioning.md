# A strategy is stamped twice: a hand-set version for its code, a hash for its parameters

## Why this

An experiment row records that a candidate returned 18%. Weeks later the row has to
answer which code produced that number, or the leaderboard is a column of figures
none of which knows where it came from. Section 36 asks for this directly and
question 8 of section 40 asks for it again.

Two different things change, and they change by different hands. Parameters are
picked by the search engine — RSI 14 this round, RSI 21 the next — thousands of times
a night, with nobody involved. The code inside a strategy is edited by a teammate:
the RSI formula moves to Wilder smoothing, the handling of a candle with no volume
changes. So the stamp is two stamps.

`paramsHash` covers the machine's half. The parameters of each member are normalised
and hashed, and nobody types anything. `version` covers the human's half: an integer
in the strategy's own metadata, sitting a few lines from the code being edited, bumped
in the same commit as the change.

Neither half alone is enough. A hash of the parameters is blind to a formula edit that
leaves the numbers alone, so two runs that differ by seven percent get the same
identity — the failure that looks like nothing is wrong. A hand-set number alone would
mean relying on a person to remember when only a parameter moved, which they will not.
Splitting it this way leaves a person responsible for exactly the half a machine
cannot see, and no more.

The mechanics follow from that. The `Strategy` table is append-only on `(id, version)`
— the registry reads each strategy's metadata at startup and inserts a row if that
pair is new, so `rsi v1` stays where it is when `rsi v2` appears. An experiment stores
the version and hash **by value**, once per member of the candidate specification,
because `0007` requires a specification to carry everything needed to identify a run
without depending on a table that can still change. Member order, key order and float
precision are normalised before hashing, or the same candidate appears under two
identities and gets tested twice.

That normalisation is now spelled out, because the search loop is the first code that
depends on it. Object keys are sorted; members are sorted by id, then version, then
parameter hash; an absent optional field is left out rather than written as null; and
every number is rounded to **six decimal places** before it is written. Six is chosen
against the parameters that exist rather than against floating point in general — weights
and the decision threshold sit on a grid of 0.1 by `0007`, and no strategy declares a
parameter finer than a thousandth — so it is far enough past what anyone types to never
truncate a real value, and near enough to swallow the difference between a number computed
two ways.

The canonical form is a string, and turning it into a hash is a separate step. It is
written that way so the normalisation can live beside the specification it belongs to, in
the shared contracts package, without dragging a cryptographic library into the browser
bundle that imports it for the types alone.

What makes the human half safe enough to rely on is a golden test per strategy: a
fixed slice of candles, the expected output stored beside it. Change the formula
without bumping the version and the test goes red at the pre-push gate, naming the
mismatch. The reminder is mechanical even though the stamp is not.

## What else we looked at

**A hash of the strategy file's contents, or the build's git commit** — the obvious
answer to "why trust a person at all", and it does remove forgetting entirely. It
loses on three counts. The identity becomes `7b2e4f…` rather than `v2`, which is worse
to read on a leaderboard and worse to talk about while defending the work. Renaming a
variable or reformatting produces a new identity for a strategy that behaves
identically, filling the table with distinctions that mean nothing. And it is still
blind in the one place it matters: fix a bug in a shared helper the strategy calls and
the strategy's own file is unchanged, so the hash is unchanged. Automating the stamp
would not have removed the need to think about what counts as a change.

**A hand-set version only, with no parameter hash** — fewer fields, and a version
number a person controls end to end. It puts the parameter half back in human hands,
where it is forgotten first: the search engine varies parameters thousands of times a
night and no bump could keep up.

**A parameter hash only** — everything automatic, nothing to remember. It cannot
distinguish two runs of the same parameters against different code, which is the exact
case the decision exists for.

**A foreign key from the experiment to the `Strategy` row** — normalised, and the
database would enforce the link section 36 wants. Rejected because a key points at a
row that can still be edited, so a specification holding a key is not self-contained,
and `0007` turns on it being self-contained.

## Trade-offs

The code stamp still depends on a person. The golden test catches a change that moves
the output on its fixture, which is most of them, but not a change confined to a branch
the fixture never reaches — a different handling of an empty window, say. That gap is
real and there is no cheap way to close it.

Every strategy now needs a golden fixture, written when the strategy is written in T11.
Two fields are stored and displayed rather than one.

A version identifies a run; it does not let the application reproduce one. The code for
`v1` no longer exists in the working tree once someone has edited the file, so the
selection list offers only the current version and re-running an old experiment runs
today's code and returns a different number. Rebuilding the old behaviour means checking
out the commit that bumped the version. That is the honest scope of the guarantee: old
results can be told apart and traced, not re-executed.

Rounding to six places is a rule that can be wrong later. A strategy whose parameter is
genuinely finer than a millionth would have two distinct settings collapse into one
identity, and the symptom is a duplicate that is skipped rather than an error. Changing the
number afterwards re-identifies every candidate ever hashed, so the stored experiments stay
valid only as long as the rule holds.

A skewed deployment — the API on new code, a worker still on old — records the version
the worker actually ran, which differs from the one the generator assumed. The stamp
makes that visible after the fact rather than preventing it.
