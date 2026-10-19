# Player research and routine validation

Player shots on target (over 0.5 / 1.5), to score, to assist, and to score or assist are research markets. They cannot publish official selections, replace a ticket leg, or enter the public Record.

## Routine

- Every 15 minutes, after production work, archive available Bet365 player markets from the existing daily odds pulls. Preserve original quote and provider times. Player names are not guessed into provider player IDs. New statistics calls defer while today's or tomorrow's production analysis has a fresh backlog, is starved, or has failed; old historical pending jobs do not permanently starve research. Collection deferrals remain visible in the research status.
- When the normal provider burst has spare capacity, collect at most one uncollected Tier 1 regulation-time final from the latest 50 results within seven days using `/fixtures/players`. Store its first observation with ignore-on-conflict semantics in the existing feed snapshot table. This is bounded evidence collection, not a complete historical backfill. No paid plan or provider subscription changes are made.
- Null player statistics remain missing. Starts, minutes, player/team/fixture IDs and observation times are retained. Historical observations collected today cannot be used in a forecast dated yesterday.
- `/api/player-research` exposes the latest research status, collection counts and blockers. Raw offers and individual statistics are not exposed by this endpoint.
- Every six hours, the existing scheduled cycle evaluates the frozen independent model trial using its last snapshot at least one hour before kickoff, one primary selection per fixture, exact retained prices and available regulation results. Conflicting results are excluded. Reports are retained, including market metrics and explicit promotion blockers. `/api/model-validation` exposes the latest report.
- Validation reads are capped at 5,000 snapshots with deterministic ordering. A cap hit explicitly blocks interpretation as a complete trial; a full database export/replay is then required. Returns refer to shadow singles at frozen prices, not official published ticket ROI. Public Record cutover remains a separate blocker.

## Player forecasting prototype

`forecastPlayerProp` is an odds-independent empirical event-frequency prototype for confirmed starters, with Jeffreys smoothing. It requires ten prior starts and 600 observed minutes in the same team within 180 days. Early substitutions remain in the denominator. Score-or-assist uses the observed union of the events. Duplicate fixture observations are excluded, not counted twice. Missing/negative counts do not become zeros.

The prototype requires an explicitly identified player, team, fixture, exact line/selection, confirmed starting lineup observed within an hour, fresh Bet365 observation/provider times within 30 minutes, and verified market settlement rules. It does not infer player identities from display names, expected minutes from popularity, or goal/assist independence. The model has no opponent adjustment and no validated edge. It is not connected to an official selection path.

## Remaining blockers

Player IDs must be reliably linked to exact Bet365 offers and bookmaker participation, substitution, extra-time and assist rules. Adequate point-in-time player histories, confirmed lineup coverage, independent event settlement, chronological development/testing, per-market Brier/log loss, and prospective price-accurate returns are still required. Player research does not cure the goal model's failed historical scores.

The independent goal model and selector remain frozen. Routine reports must not be used to retune on the prospective holdout. Any revised model or selection policy requires a new frozen protocol and untouched evaluation period. Full migration remains blocked until its declared evidence requirements pass and the official settlement source is cut over.

## Validation and rollback

Tests cover player/team market isolation, raw offer retention, missing statistics, joint event counting, early substitutions, exact identity and stale-price rejection, duplicate/future history exclusion, provider budget reservation, immutable research storage, frozen forecast scoring and result conflicts. Existing Elite, Ladder, publication and Record regressions remain required.

Revert this release to disable the two research routines and endpoints. Existing historical locks and publication rows are never modified by either routine. Preserve the collected research snapshots for reproducibility; do not delete historical data during rollback.
