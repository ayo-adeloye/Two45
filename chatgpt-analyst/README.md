# ChatGPT Analyst V1

Status: design pilot; not connected to production publication.

Workflow:
1. Export upcoming fixture IDs, kickoff timestamps, available markets and bookmaker odds with source timestamps.
2. Upload the export to ChatGPT for structured predictions.
3. Import JSON recommendations as drafts.
4. Validate each fixture, exact market, selection, bookmaker, current price, kickoff, and distinct Elite 3 fixtures server-side.
5. Require 2–4 distinct fixtures and 2.80–3.20 combined decimal odds for Elite 3.
6. Publish only via authenticated admin approval, then settle and audit results.

Do not disable the existing production pipeline until this workflow passes an end-to-end test. Never treat locally validated drafts as published tickets.
