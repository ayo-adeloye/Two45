# Two45 V52 — One Provider Call, No Waiting

September 30, 2026

Reliability invariants:
- Scheduled Worker execution never sleeps waiting for API-Football pacing.
- If provider pacing is not ready, the fixture is safely deferred to the next one-minute cron.
- A fixture may make at most one provider request in a cron cycle.
- Fetching the final missing team baseline now defers final analysis/odds to the next cron.
- Provider gateway timeout reduced to 6.5 seconds.
- Per-fixture analysis timeout reduced to 10 seconds.
- Whole scheduled analysis pass bounded to 14 seconds.
- Atomic database claim (V50) and short critical path (V51) remain active.

Purpose: prevent Cloudflare from killing a scheduled event between claim and progress persistence, which caused the recurring zero-processing stalls.
