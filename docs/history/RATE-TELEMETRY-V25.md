# Two45 V25 Provider Rate Telemetry

Production checkpoint: September 28, 2026.

V25 preserves all V24 cruise-control behavior and adds provider response telemetry only.

Captured on every API-Football response when present:
- x-ratelimit-limit (provider per-minute limit)
- x-ratelimit-remaining (provider per-minute remaining)
- x-ratelimit-requests-limit (daily limit)
- x-ratelimit-requests-remaining (daily remaining)
- response status
- provider response timestamp

These values are stored in the existing `api-football-pacing` snapshot and exposed through `/api/model/status` via `providerPacing.state`.

Purpose: distinguish account/key quota pressure from shared-IP/network protection when API-Football returns rate-limit errors.

No model, ticket, queue-priority, Ask Two45, quiet-window or request-cap rules were changed from V24.
