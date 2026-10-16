# Sportsbook betslip transfer — parked

Status: disabled in production at the user's request on October 15, 2026. The copy-ticket/homepage-opening flow does not meet the intended experience. Do not re-enable it as the finished feature.

## Intended experience

Tap a Two45 selection or complete ticket and open the selected sportsbook with the exact market/outcome already in its betslip. The user reviews live prices, availability and stake and independently decides whether to wager. Two45 never places wagers.

## Saved implementation

The Phase 1 prototype remains behind `SPORTSBOOK_TRANSFER_ENABLED=false` in index.html. It includes browser-persistent preference, complete-ticket copying and manual-copy fallback. Tests cover the disabled production state and explicitly enable the prototype in an isolated browser context to preserve its lab tests. Implementation checkpoint: https://github.com/ayo-adeloye/Two45/commit/05c7875430b66550e86086bbb3bb3f57deb0dfe5

## Research and future route

- DraftKings' official Network parlay page publishes Add to Bet Slip URLs using `?outcomes=...`. Single-game parlays use a different event/selection structure. This proves the operator uses selection-bearing links, not that arbitrary third-party generation is a supported public API: https://dknetwork.draftkings.com/draftkings-sportsbook-parlays/
- Current Two45 normalization stores fixture identifiers, market/selection names and Bet365 quotes; it does not preserve DraftKings outcome IDs. Those IDs cannot be inferred reliably from Two45 fixture IDs or Bet365 market names.
- The Odds API is a possible zero-additional-cost ID/link source: its published free tier has 500 credits/month, lists DraftKings without a paid-only restriction, and documents `includeLinks=true` / `includeSids=true` where available. Exact soccer market coverage, a real returned link, and successful slip population have not been tested. It is a third-party service, not a DraftKings developer API. Sources: https://the-odds-api.com/ ; https://the-odds-api.com/liveapi/guides/v4/ ; https://the-odds-api.com/sports-odds-data/bookmaker-apis.html
- Bet365 documents consumer Bet Share links. Its partner programme is free to join, but approved access and arbitrary prefilled-slip generation at no cost remain unverified. Sources: https://help.bet365.com/s/en-us/sports/bet-share ; https://www.bet365partners.com/en/help

## Resume checklist

1. Obtain a free data key or approved operator integration without purchasing a plan.
2. Prove one actual Two45 soccer selection maps to the exact sportsbook fixture, period, market, line and outcome. Do not substitute another selection.
3. Verify the link in an eligible user session, including login redirects, mobile app/browser behavior and expired markets; never submit a wager.
4. Test complete-ticket transfer separately from single selections. Hide unavailable transfers and clearly explain missing matches.
5. Cache links and enforce a strict free quota. Keep Bet365 prediction pricing, selection, queue, settlement and V115 egress protections unchanged.
6. Re-enable only after a new user request and verified behavior; do not relabel a homepage link as Add to Bet Slip.
