# Two45 V2 independent scheduled jobs — migration gate

Status: **preparation only; not deployed**. This branch is isolated from the older Two45 V1 application. Do not merge until the V2 data source is established.

## Verified blockers (AppDeploy V2 `two45-v2-staging-o4lzi8`)

- All three AppDeploy crons (nightly-analysis, nightly-settlement, ticket-builder) were disabled by the platform with `credits_exhausted`. A successful last-run status does not override that.
- The V2 backend stores research, published picks, pricing and jobs through `@appdeploy/sdk` `db`. Those SDK calls are not a documented external database connection. A GitHub Action or Cloudflare Worker **cannot** simply import the AppDeploy backend and access its data.
- V2's current public endpoints are read-oriented and do not provide an authenticated export/import or independent write path for the full database.
- The repository's `main` branch is the older Two45 implementation, not a proven copy of V2. Never replace production with `main` as a migration shortcut.

## Safe migration sequence

1. Obtain a **read-only full export** of V2 tables: `three_d_research_v1`, `three_d_priced_selections`, `three_d_published`, `three_d_quote_checks`, `three_d_jobs`, `three_d_ticket_jobs`. Include row counts, IDs, timestamps, and checksums. Preserve originals.
2. Choose a durable, independently accessible database and verify the actual free-tier/paid limits. Existing Supabase may be used **only if** its costs and egress can be controlled; it is not assumed necessary. Cloudflare D1 is an alternative requiring schema migration.
3. Implement a portable TypeScript domain layer with `ResearchStore`, `OddsStore`, `PublishedBoardStore`, `JobStore` interfaces. Provide a DB adapter and migrate saved records, including immutable bookmaker quote provenance.
4. Migrate **settlement first**: read due published selections, fetch final results in a bounded/cached batch, grade each selection, and aggregate the category ticket results. Make processing idempotent and keep an audit trail.
5. Migrate **ticket building second**: read persisted research, verify market-specific odds and quote freshness, enforce no duplicate fixture per ticket, publish atomically and log no-pick reasons. Do not republish stale quotes.
6. Migrate **analysis last**: check Tier 1–3 fixtures cheaply; deduplicate fixture research; cache team histories; throttle AI; persist an account-wide circuit breaker on 429/503; never invent corners/cards/shots evidence.
7. Run both implementations in read-only comparison mode. Switch scheduler only after fixture counts, odds provenance, picks, and settlement match. Disable the old scheduler before enabling writes in the new system.
8. Monitor daily AI calls, API-Football calls, database reads/egress, failed jobs, ungraded selections, and published ticket counts. Set cost ceilings and alert thresholds.

## Non-negotiable release checks

- No user-facing fabricated stats or prices.
- Tier 4 never auto-analyzed.
- All generated tickets link to verifiable stored research and timestamped bookmaker quotes.
- Historical data is not lost; counts and hashes reconcile.
- Scheduler is active and completes at least one real end-to-end cycle.
- Do not promise free unlimited hosting, AI, or data access.

## Next blocking dependency

We need an AppDeploy-supported export path or equivalent authorized database access. Without it, moving cron code to GitHub/Cloudflare would produce jobs disconnected from V2's records. **Do not turn on a second scheduler against empty storage.**
