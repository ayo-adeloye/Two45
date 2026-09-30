# Two45 V51 — Short Critical Path Reliability

September 30, 2026

Reliability changes:
- The scheduled watchdog is now the only stale-recovery pass in the cron critical path.
- Duplicate stale-recovery calls inside processJobs are skipped for scheduled runs.
- Queue load timeout reduced to 4 seconds.
- Scheduled analysis pass bounded to 18 seconds.
- Cron status is persisted immediately after the model stage, before maintenance.
- Board evaluation is deferred while fresh analysis backlog exists.
- Atomic V50 database claim remains in place.
- One-minute Cloudflare cron remains unchanged.

Goal: if pending work exists, cron time is spent claiming/analyzing a fixture rather than repeating recovery and board maintenance.
