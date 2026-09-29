# Two45 V33 — Healthy Throughput

Production checkpoint: September 29, 2026.

- Worker version: 33
- Independent model: two45-independent-v1.7
- Provider operates 24/7 through the authenticated Supabase gateway.
- Daily working target: about 6,000 requests.
- Practical cap: 6,500; hard cap: 7,000; provider plan: 7,500/day.
- Fresh baseline mode uses a 7-second intra-cycle provider gap so short cycles complete inside Cloudflare scheduled runtime.
- Cron: every minute.
- Normal fresh-backlog minute: up to 2 fresh matches.
- Every fifth minute: 1 fresh match, leaving room for a general feed refresh.
- Once the fresh backlog clears: 1 deep-enrichment refresh per cycle.
- Pipeline overlap lock: 75 seconds.
- Stale IN_PROGRESS recovery: 5 minutes.
- Dynamic model-board refresh trigger keeps completed v1.7 forecasts visible immediately; the heavier board evaluator is skipped while clearing fresh baselines.
- Provider pacing remains globally serialized and rate-limit telemetry is retained.
- First clean V33 validation: Drukpa vs Transport United completed in about 12 seconds; board analyzed count increased from 4 to 5; provider remained HTTP 200.
