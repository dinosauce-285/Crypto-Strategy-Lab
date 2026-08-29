# Search runs carry selected strategy versions

## Why this

T20 asks the user to choose which strategies enter the search space, while also
requiring the list to come from registry metadata instead of hard-coded UI names.
The search run therefore carries strategy references selected from `/strategies`:
both `id` and `version`. The candidate source resolves those references back to
registry metadata before generation.

This keeps the frontend at the boundary: it chooses from metadata and starts a
bounded run, but it never builds candidates, computes parameters, or decides which
groups are valid. Those choices stay in the generator and registry where T17 and
ADR 0012 put them. Including `version` follows the registry identity and keeps two
registered versions of one strategy selectable independently.

## What else we looked at

**Let the frontend send candidate specs** - this would make the T20 screen easy,
but it would move candidate construction and parameter selection into React. That
breaks the "frontend renders, never computes" rule and makes every new strategy a
UI change.

**Create named saved search spaces** - this would make runs reusable, but it adds
a new persisted concept before the brief needs it. Dataset identity already owns
leaderboard comparability; search-space identity can wait until users need to
rerun named experiments.

**Keep using every registered strategy** - this matches T17 but misses T20's
explicit selection step. It also hides the section 46 demo moment where MA, RSI,
Bollinger and Support Resistance are selected before START SEARCH.

## Trade-offs

A run is no longer described by dataset and bound alone; debugging it also needs
the selected strategy references. The API must reject unknown `id@version` pairs,
and a domain-guided run can still exhaust immediately if the selected references
do not contain the groups that generator needs.
