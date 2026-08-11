---
name: add-strategy
description: Add a new trading strategy to the registry so it becomes available to the combination engine, the search space, the backtester and the UI without editing any of them. Use whenever a new indicator, pattern or signal source is being turned into a strategy.
when_to_use: Adding any new strategy — MA, MACD, SMC, Wyckoff, sentiment, anything that emits BUY/SELL/HOLD.
user-invocable: true
category: planning
keywords: [strategy, registry, plugin, indicator, signal]
---

# Add a strategy

Adding a strategy must cost **one new file and one registration line**. Nothing else may
change — not the UI, not the parameter form, not the search engine, not the backtester,
not the database.

This is not a style preference. Section 41 of the brief says the lecturer may ask for a
MACD strategy to be added during the defence, and the number of files that change is the
demonstration of whether the architecture works. If following this skill requires touching
a sixth file, **the registry is wrong — fix the registry, not the caller.**

## Steps

1. **Read an existing strategy first.** Copy its shape rather than inventing a second one.
   If none exists yet, T11 has not been done and this skill does not apply yet.

2. **Create one file** under the strategy folder. It contains only the trading rule.
   Forbidden inside it: exchange calls, database access, chart code, notifications, and
   computing its own profit. Everything it needs arrives through the context.

3. **Declare its metadata** — id, display name, functional group (trend / momentum /
   volatility / structure / information), and each parameter with its type and range. The
   parameter form and the search space are generated from this. A strategy with no metadata
   forces the UI and the search engine to hard-code its name, which is the anti-pattern in
   section 44.

4. **Register it** with one line. If registration requires editing a switch, a list of
   imports in three places, or a database row, stop and fix that first.

5. **Verify the claim, do not assume it.** Run `git diff --stat`. If more than the two
   expected files changed, the architecture regressed and this is the moment to catch it —
   not during the defence.

6. **No decision record needed** for an ordinary strategy: it settles nothing, it uses the
   contract that already exists. One *is* needed if the strategy forced a change to the
   context, the signal shape, or the registry — because that means a contract moved.

## The test this skill really is

After adding, ask: did the backtester change? Did the leaderboard change? Did the search
engine change? Did any screen change?

Four no's means the plugin architecture holds. Any yes is a coupling leak, and it is worth
more than the strategy itself to go and fix it.
