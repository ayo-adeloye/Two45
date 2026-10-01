# Two45 V29 — 24-Hour Cruise Control

Production checkpoint: September 29, 2026.

- Worker version: 29
- Model: two45-independent-v1.7
- Provider operation: 24/7. The previous midnight–5 AM quiet window is disabled.
- Provider requests remain protected by the Supabase egress gateway, shared pacing, budget locks, daily caps, and cooldown handling.
- API-Football spacing remains 22 seconds between provider calls.
- Model batch remains 1 per cycle to spread provider usage across the full day/night.
- Practical daily target remains 6,500 requests; hard cap remains 7,000.
- Cloudflare cron is */5 * * * * (every 5 minutes), including overnight.
- Tomorrow preload logic remains separate from provider availability: next-day preload still opens at 8 PM Eastern, while existing active-date analysis and refresh work may continue overnight.
- Ask Two45 on-demand analysis remains available.
- Supabase gateway remains two45-football-gateway.
- Dynamic model-board refresh migration remains required so v1.7 forecasts appear immediately on the board.
