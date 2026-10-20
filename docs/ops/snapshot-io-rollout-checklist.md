# Two45 Disk I/O: measurement and rollout checklist

This branch contains a read-only reproducible database measurement query at `scripts/snapshot-io-audit.sql`.

### Proven from code
- `saveFeedSnapshot` uses merge-on-conflict upserts that overwrite payload and time fields.
- `feedDue` relies on `refreshed_at`, so blanket unchanged-payload suppression changes scheduling.
- `api-football-pacing` writes during rate-limit reservation; suppressing or deferring its writes can cause quota overshoot and double reservation.
- `ticket-lock`, cron state, and odds refresh timestamps must be classified individually before being throttled.

### Minimal-risk next implementation
Implement an opt-in, family-specific cache/coalescing policy **only after** measuring per-key call frequency and validating every caller. Exclude lease, ticket, quota, rate-pacing, publication and provider-freshness records. Do not install generic no-op SQL triggers; even identical payloads can have meaningful timestamp updates.

### Acceptance criteria
- Compare equal-duration pre/post rates of `calls`, `shared_blks_dirtied`, `wal_bytes` (differences of samples, with same queryid and reset epoch).
- Staging test of scheduled runs, API-Football reservation limits, odds source timestamps, ticket transitions, Record settlement and error recovery.
- Production deployment only after a code-reviewed patch and staging success; roll back on any stale-odds or state coordination failure.

Current status: measurement tooling only, no production behavior changed.
