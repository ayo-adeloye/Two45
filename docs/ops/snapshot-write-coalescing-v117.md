# Snapshot write coalescing v117 — staging QA

Coalesces only **simultaneous identical** writes to `player-research-v1:`, `match-intelligence:` and `model-analysis:` snapshot keys, scoped to the same Worker isolate. Calls with differing payloads or TTLs perform separate writes. Entries are evicted on both success and failure.

## Staging checks
1. Concurrent same-key/same-payload calls produce one PostgREST upsert; both callers await the result.
2. Different-payload concurrent calls produce separate upserts. Both are allowed to race as before, so downstream freshness semantics are unchanged from ordinary concurrent upserts.
3. A rejected upsert rejects all coalesced callers and subsequent retries can write again.
4. `api-football-pacing`, `ticket-lock`, `odds`, `fixture-odds`, `cron-status` and quota/lease keys are not deduplicated.
5. Measure upsert calls and WAL deltas over equivalent periods. If coalescing gains are negligible, do not increase caching scope without reviewing all callers.

This is an incremental change. It does not solve sequential redundant upserts or the Bet365 odds freshness problem. Must test and deploy to staging prior to merging.
