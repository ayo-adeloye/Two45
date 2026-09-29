# Two45 V24 Cruise Control

Production checkpoint: September 28, 2026.

- Worker version: 24
- Independent model: two45-independent-v1.7
- Tomorrow preload begins at 8 PM America/New_York.
- Fresh Tomorrow fixtures are prioritized ahead of repeat/deep-enrichment jobs.
- First forecast pass uses the minimum reliable two team-stat provider calls; recent form, H2H, injuries and lineups are layered onto later refresh passes.
- Model batch: up to 4 fixtures per five-minute cron cycle.
- API-Football provider spacing: 22 seconds.
- Short provider cooldowns are waited out; longer cooldowns are detected before claiming a job.
- While a fresh Tomorrow baseline backlog exists, model work takes priority over feed sweeps.
- Strict provider quiet window: 12:00 AM–5:00 AM America/New_York. No API-Football provider requests during this window.
- Ask Two45 on-demand analysis remains available to signed-in users; during quiet hours it queues for the 5 AM resume.
- /api/model/process and /api/model/settle require x-two45-internal-key.
- User browsing/search/refresh remains cache-based and must not directly consume API-Football requests.
- Practical daily cap remains 6,500; hard cap remains 7,000.
- Production cron remains */5 * * * *.
