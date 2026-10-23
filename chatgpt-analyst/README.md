# ChatGPT Analyst V1

Status: design pilot; not connected to production publication.

Workflow:
1. Export upcoming fixture IDs, kickoff timestamps, available markets and bookmaker odds as a single analysis-time snapshot.
2. Upload the export to ChatGPT for structured predictions.
3. Import JSON recommendations as drafts.
4. Validate each fixture, exact market, selection, bookmaker, available snapshot quote, kickoff, and distinct Elite 3 fixtures server-side.
5. Require 2–4 distinct fixtures and 2.80–3.20 combined decimal odds for Elite 3.
6. Publish only via authenticated admin approval, then settle and audit results.

Engine 2 simulation has been disabled in the production Worker. Existing fixture, odds collection, and settlement services must remain active. The ChatGPT Analyst importer and publication path still require end-to-end production verification. Never treat locally validated drafts as published tickets. Do not chase odds movements, poll for quote freshness, or automatically rebuild a ticket because its price changed. Record quoted odds as an analysis-time reference, not a guaranteed sportsbook price. Do not schedule odds-only reanalysis. The final available sportsbook price may differ.
