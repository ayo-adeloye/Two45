# Sportsbook transfer — Phase 1

Elite 3, each Weekend Ladder rung, and a qualified High Conviction analysis include a Bet365/DraftKings preference saved on the current browser, complete-ticket copying, and an official sportsbook opening link. Clipboard denial exposes selectable ticket text for mobile copying. No sign-in is required for the local preference; blocked storage falls back to Bet365.

Copied text includes every leg's fixture, fixture ID, available kickoff and competition, exact market/selection identifiers with readable labels, available original Bet365 labels, and indicative decimal odds. Missing prices or kickoff times are explicitly unavailable. Locked ticket data is used without recomputing selection. Empty/building tickets and NO_BET analyses have no transfer action.

The page and copied ticket require checking fixtures, selections, markets, live odds and availability. DraftKings prices may differ because Two45 uses Bet365 pricing. Opening a sportsbook does not populate a betslip or place a wager. A preference change only affects the transfer destination.

## Cost and preserved behavior

All transfer operations use existing in-memory data, localStorage, the clipboard and ordinary HTTPS links. No sportsbook API, additional data refresh, account integration, paid provider or database write is introduced. worker.js, queue/polling, settlement, pricing selection, cron, and V115 egress protections are unchanged.

## Official deep-link investigation (October 15, 2026)

- Bet365 officially describes Bet Share, with images/links depending on bet type, generated through its app after placing a bet or via My Bets. This documents its consumer sharing workflow, not a public third-party endpoint or supported format for generating arbitrary prefilled tickets: https://help.bet365.com/s/en-us/sports/bet-share
- DraftKings officially describes finding an event/outcome and adding it to the betslip; latest odds/lines appear there: https://help.draftkings.com/hc/en-us/articles/26268411257875-How-do-I-place-a-bet-on-DraftKings-Sportsbook-US and https://help.draftkings.com/hc/en-us/articles/4405232144659-What-is-a-bet-slip-US
- No publicly documented, officially supported, no-cost third-party ticket-generation/deep-link API was verified for either operator. This is a limit of verified public documentation, not a claim that private partnership integrations cannot exist. No unofficial URL parameters, reverse-engineered IDs or claimed automatic population are implemented.
- Official opening URLs: https://www.bet365.com/ and https://sportsbook.draftkings.com/. These open the operator website; app handoff, location access, account eligibility, live market availability and accepted prices remain controlled by the operator.

## Validation

- Browser test: `node tests/sportsbook-transfer.cjs` with Playwright available (optionally set TWO45_BROWSER_PATH to an installed browser). Tests 390px layout, clipboard success/denial, persistent preference after reload, all ticket types, exact tuple preservation, escaping, official destinations and no sportsbook API calls. API responses are mocked to avoid provider costs.
- `node tests/record-ask.cjs` passes.
- All six existing Elite intelligence/tier/research/scope/explanation suites pass.
- The existing `tests/tightening.cjs` frontend assertions pass, then its old VM loader fails on the bundled worker's existing ES-module export. No backend changes are included to alter this unrelated harness.

## Verified deployment target

Cloudflare account 5f71d9a8ed4c59b7a8ca820968c815b1, Pages project two45 (4aeb00f4-9c86-4d27-9dcd-65c61eaef68e), production branch main, repository ayo-adeloye/Two45. Canonical deployment before this change: 100cf9c4, commit a7dc5e4bcaa7b962b583ee17280a0458f7d837ff. Supabase project tgvefrvgdnkzlzmpttss matches the frontend; inspected read-only, no schema or function changes.
