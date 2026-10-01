# Two45 V53 — Lock-Free Scheduled Cron

September 30, 2026

Reliability changes:
- Removed the global scheduled-analysis refresh lock from the one-minute cron path.
- Atomic Postgres fixture claiming remains the ownership guard.
- Every cron invocation writes a starting heartbeat before watchdog/model work.
- V52 non-blocking provider pacing and one-provider-call-per-cycle rules remain active.

Why: the global refresh-lock RPC was a single point of failure. When acquisition failed, a cron minute returned before updating heartbeat or processing any fixture, making the scheduler appear active while the queue made no progress.
