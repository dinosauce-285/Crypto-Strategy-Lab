# Active backtests hold a durable Dataset lease

## Why this

A Dataset may be deleted only when no Experiment refers to it, but an Experiment used to
exist only after simulation finished. A single backtest or queued worker could therefore
read a Dataset, run against it, and lose it before recording its result. The failure is
not recoverable: the worker cannot reconstruct the rules or attach its result to a deleted
Dataset.

An active calculation now creates a short-lived Dataset lease in Postgres before it starts,
renews it every minute, yields after each processed candle so renewal can run, and removes it in `finally`. Each worker attempt owns a fresh lease
id, so a retry never collides with the record a crashed attempt left behind. The transaction that writes an Experiment renews and verifies its lease before inserting, so a completed row cannot be written after protection was lost. Dataset deletion removes expired leases first, then relies on
the same foreign-key restriction that protects Experiments. The lease is visible to both
the API process and the separate worker process, so one tab cannot delete data another is
actively using. A worker records its final failed Experiment before releasing its lease, so
failure accounting receives the same deletion protection as a completed result.

## What else we looked at

**Disable the controls in React** — useful feedback, but it protects only the tab that
started the work. Another tab or a direct HTTP call can still delete the Dataset, so it
cannot be the integrity boundary.

**Create an Experiment with status `running` before simulation** — makes active work
visible, but turns an Experiment into a partially known result. Crash recovery, duplicate
handling and leaderboard filtering would all have to learn a third lifecycle state, which
is more coupling than a temporary use record needs.

**Keep the lease only in process memory** — small and sufficient for one single backtest,
but the worker is a separate process and a restart drops the protection exactly when it is
needed.

## Trade-offs

The schema gains a small operational table and every backtest adds an insert, periodic
renewals, and a delete. A crashed process can leave a lease behind until its expiry,
temporarily refusing a safe deletion. Expired rows are removed at API and worker startup as
well as before acquisition and deletion. That is preferable to allowing deletion while the
work might still be live; the expiry bounds the inconvenience rather than making a Dataset
undeletable forever.
