# Two45 V55 — Atomic Fresh State Machine

September 30, 2026

The repeated stall pattern showed cron reaching the watchdog but failing before a model result was persisted. V55 removes the multi-request queue path from fresh coverage:

- PostgreSQL selects and claims one fresh job atomically with FOR UPDATE SKIP LOCKED.
- The same claim transaction marks canonical analysis PROCESSING.
- Baseline deferral updates feature-job and canonical state in one RPC.
- processOne no longer repeats a team-feature cache lookup already performed by the caller.
- Team-feature cache reads/writes and provider calls are tightly bounded.
- The older ranked queue remains only as a fallback once fresh coverage is cleared.

One slow database/API operation can defer one fixture, but it cannot hold the whole fresh-analysis queue.
