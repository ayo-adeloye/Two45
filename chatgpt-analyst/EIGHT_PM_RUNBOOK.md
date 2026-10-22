# 8 PM Eastern tomorrow-board readiness
Date-specific operational checklist for ChatGPT Analyst V1.

1. At or after 8 PM America/New_York, request the **next local calendar date** through the production `/api/model-board/tomorrow` route. Never infer tomorrow from UTC alone.
2. Confirm returned fixture IDs, kickoff times, and `NS` statuses. Exclude started, cancelled, postponed, or duplicated fixtures.
3. Check the matching `model-board:YYYY-MM-DD` snapshot timestamp and fixture count. If missing, label NOT READY; do not use today's board as tomorrow's.
4. Check matching `odds:YYYY-MM-DD` snapshot and exact bookmaker/market/selection coverage. Preferred bookmaker order: Bet365, Pinnacle, 1xBet, Marathonbet, William Hill.
5. Separate snapshot refresh time from **provider quote update time**. Missing provider timestamps must fail price verification; never synthesize them.
6. Export fixtures and quotes through `chatgpt-analyst/pilot.html`; upload both files to ChatGPT for qualitative analysis. Analyst results remain drafts.
7. Run `node --test chatgpt-analyst/*.test.mjs` in a Node-enabled checkout. Reject any failed tests.
8. Never publish until an authenticated backend import, admin approval and live price verification have passed an end-to-end test. Keep the legacy production workflow active until then.

## Go / no-go
- GO for **manual draft analysis** if tomorrow's fixtures and sufficient performance data are available.
- GO for **priced draft** only with exact bookmaker quote and verified freshness.
- NO-GO for **production publication** until authenticated import, admin approval, and publication/settlement QA are proven.
