# Two45 snapshot write I/O remediation (2026-10-19)

## Evidence (read-only production inspection)

- pg_stat_statements shows about 245,750 lifetime upserts to public.two45_feed_snapshots and 761,414 shared blocks dirtied (cumulative since stats reset, **not** current writes/s or physical disk usage).
- worker.js saveFeedSnapshot always calls PostgREST INSERT ... ON CONFLICT DO UPDATE for payload, refreshed_at, expires_at and request_count.
- Largest retained payload families: player-research-v1 ~15 MB, odds ~11 MB, fixture-odds ~6.8 MB, model-analysis ~6.2 MB, model-board ~4.5 MB.
- model-board newest observed 2026-10-19 02:03 UTC while ticket-lock remains active. Publishing freshness and lock safety must be validated separately.

## Required implementation

1. Instrument per-key-family save counts, payload sizes, and trigger source for one bounded production sampling interval. Use counters aggregated in memory and report rarely; **do not** persist each instrumentation event to Supabase.
2. Introduce bounded, key-family-specific write coalescing for non-critical snapshots. Preserve refreshed_at/expires_at semantics and make every skip conditional on an unexpired, validated identical payload.
3. Exempt api-football-pacing, lease/lock/ticket state, publishing, quota/accounting, odds freshness observations and any key whose write drives coordination or correctness. Never treat an old provider timestamp as fresh because a cache was touched.
4. Benchmark writes/sec and DB I/O before and after in equal sampling windows; verify tickets, live pricing, records and cron cadence. Roll back immediately if any freshness or state-transition regression appears.

## Safety

Do not install a blanket BEFORE UPDATE trigger or disable all unchanged-payload writes: timestamps and leases carry application semantics. Do not run destructive index maintenance or changes against production without measured evidence.

## Deployment state

This document is diagnostic/preparatory only. No Worker or SQL behavior is changed by this commit. A code patch plus staging QA is required before production rollout.
