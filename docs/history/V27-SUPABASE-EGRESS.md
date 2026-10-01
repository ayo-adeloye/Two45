# Two45 V27 Provider Egress

Production checkpoint: September 28, 2026.

- Worker version: 27
- Independent model: two45-independent-v1.7
- Keeps the V26 wait/cooldown fixes and V24 cruise-control backlog prioritization.
- API-Football transport now goes through the authenticated Supabase Edge Function `two45-football-gateway`.
- The Cloudflare Worker continues to hold the API-Football key; the gateway receives it only on the authenticated server-to-server request.
- Supabase Edge Function JWT verification is enabled.
- Gateway allows only the API-Football endpoints used by Two45: teams/statistics, fixtures, fixtures/headtohead, fixtures/lineups, injuries, odds, standings.
- Provider rate-limit headers are forwarded back to the Worker.
- All existing request caps, 22-second pacing, 8 PM Tomorrow preload, 12 AM–5 AM provider quiet window, and five-minute cron remain in force.
- Ask Two45 on-demand analysis remains unchanged.
