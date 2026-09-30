# Two45 V52 — Bounded Provider Cycle

September 30, 2026

The repeated stall showed cron heartbeats continuing while the model stage never returned. V52 makes every external dependency fit inside a bounded cron cycle:
- API-Football gateway fetch aborts after 4.5 seconds.
- Queue load is bounded to 2.5 seconds.
- One-fixture processing is bounded to 7 seconds.
- Whole model pass is bounded to 9.5 seconds.
- Scheduler lock lease reduced from 50 seconds to 25 seconds.
- A distinct analysis-starting heartbeat is persisted before queue processing.
- Existing V50 atomic claims and V51 short critical path remain intact.

A slow provider or gateway can now defer one fixture, but it cannot freeze the entire analysis pipeline.
