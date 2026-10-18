# Independent forecasting core v3.1

## What changed

This is a new forecasting engine, separate from the selection wrapper and the existing v1.9 heuristic. It learns league/season scoring rates, home advantage, team attack and opponent defence from regulation full-time results using a regularized, recency-weighted Poisson likelihood. Season venue scoring and conceding rates enter as shrunk, timestamped covariates. The development-selected configuration is frozen: 90-day half-life, team penalty 12, season weight 1, and low-score correction rho 0. Rho was tested on development data rather than assumed useful.

All supported probabilities come from one normalized score distribution: 1X2, double chance, BTTS, half-goal totals, team goals and half-goal handicaps. Adaptive score tails replace the old seven-goal truncation. A log-rate mixture represents approximate parameter uncertainty; its diagonal-curvature approximation is explicitly labelled and is not a calibrated confidence guarantee.

The engine never accepts bookmaker prices as forecasting features. Missing goals are null, not zero. Missing lineup/absence/xG observations do not become fabricated certainty or hand-set boosts. Contextual adjustments require separately validated coefficients; they are currently excluded. Predicted goal expectation is not claimed to be observed shot-level xG.

The architecture is related to the goal-count approach in [Dixon and Coles (1997)](https://doi.org/10.1111/1467-9876.00065). Our implementation, regularization, feature provenance, uncertainty approximation and validation gates are specific to Two45; the paper does not establish this implementation's performance.

## Data and historical replay

The first prototype used 1,427 full-time fixtures from research forecasts and failed the chronological comparison. It remains in Git history and in the initial evaluation artifact. That corpus was also biased toward fixtures the old pipeline analyzed.

The production training corpus now retains 8,468 regulation full-time fixtures from provider snapshots, regardless of whether they were analyzed or published. Full-time statuses exclude AET/PEN and ambiguous final-score clocks. Result availability uses the retained observation timestamp, or an earlier matching settlement timestamp when available. Unknown earlier availability is not invented. Conflicting fixture identity or scores are recorded separately and excluded from subsequent training.

Team-feature revisions are now immutable. Replay joins only same-team, same-league, same-season observations available before the declared decision time, with provider data cut off before match day. The original mutable team snapshot table is retained for compatibility; new feature-history identities point to retained revisions.

Development starts October 6, 2026; the expanded historical test starts October 12. Hyperparameters use development scoreline likelihood. Test-day refits use only results observed before that day, with the configuration frozen. Legacy comparison selects the latest pre-match v1.9 forecast available at least one hour before kickoff, once per fixture. The expanded test contains 2,256 fixtures and 266 comparable historical legacy events.

| Paired diagnostic, lower is better | v1.9 | v3.1 |
| --- | ---: | ---: |
| Event Brier score, 266 events | 0.137141 | 0.144492 |
| Event log loss, 266 events | 0.440625 | 0.462725 |
| Full-score log loss, 266 fixtures | 3.242436 | 3.214899 |
| Event Brier on 13 comparisons passing v3.1 data gates | 0.138712 | 0.135780 |

The three paired fixture-day blocks give a bootstrap Brier difference interval of +0.005632 to +0.023476 (v3.1 minus v1.9). The broader event comparison is worse. The 13 eligible comparisons are too few for approval. Match-result and total-goal probabilities still require improvement; handicap Brier is almost unchanged. The raw single-price bookmaker benchmark is diagnostic only because historical complete-line quote sets and exact quote timestamps are missing. Historical strategy ROI cannot be validated from these records.

The first prototype consumed part of this historical period before the season-feature and corpus revisions. These later replays are exploratory comparisons, not fresh untouched holdouts. A new prospective holdout is mandatory. No favorable subset, scoreline metric, calibration tweak, or threshold reduction is used to bypass that requirement.

## Production operation

- `two45_goal_results_v3`: permanent training results, separate from public selections.
- `two45_goal_result_conflicts_v3`: permanent conflict evidence; conflicted labels abstain.
- `two45_goal_feature_history_v3`: immutable timestamped feature revisions.
- `two45_goal_model_artifacts_v3`: append-only fitted parameters, cutoff, dataset hash and validation state.
- `two45_goal_forecasts_v3`: parallel forecasts, input references, all supported probabilities, quote checks, candidate/rejection records and legacy comparisons.

The seeded artifact is `a17c6efb-cc8c-4be9-bb9b-d31f707ca020`, trained before `2026-10-18T01:23:23.216Z`. It contains 8,468 fixtures and converged in 31 optimizer iterations. Its dataset hash is `972374af3c1673f044c06d29bcc24edff8ce35926331b12b19e270a6d88a6e2d`. Hashing uses the canonical PostgreSQL JSONB representation of the cutoff-specific corpus. Artifacts never overwrite earlier models.

Daily retraining is wired into the existing scheduled Worker. It uses the frozen configuration, observes a retry backoff, checks convergence and corpus bounds, and never automatically retunes or activates a model. Fixture inference fetches only its league and two team parameter slices; it does not repeatedly download the roughly 1.7 MB full model. No additional paid football-provider calls are added. Training and inference CPU must remain within the existing account's [Worker limits](https://developers.cloudflare.com/workers/platform/limits/); the single local fit measured about 0.73 seconds. Production daily training timing is observable through the status endpoint.

New core probabilities flow into the v2 selection checks in parallel. Calibration is trained only on settled v3.1 observations frozen at least one hour before kickoff, one snapshot per fixture. Missing or insufficient market/line calibration rejects a selection. Existing v1.9 research and public publishing remain unchanged, and core forecasts never enter the official Record.

Health/status: `/api/health/forecast-core`. It reports mode, latest artifact, forecast count, training state, result conflicts and recent rejection reasons. The core mode and `promotionAllowed: false` are explicit. Public users cannot read or write training tables; service-role writes cannot update or delete evidence/artifacts.

## Reproduce and validate

```text
node forecast-core-v3.test.mjs
node tests/forecast-core-runtime-v3.cjs
node scripts/evaluate-forecast-core-v3.mjs fixtures.json legacy-forecasts.json report.json ISO_CUTOFF features.json
```

Use `scripts/export-forecast-core-v3.sql` for prospective output, then `scripts/evaluate-shadow-v2.mjs` for fixed-cutoff selection scoring and ROI. The export preserves v1.9 probabilities separately, so its baseline is not accidentally replaced by v3 probabilities. The earlier model, tier, public Record, Ladder, frontend syntax and selection tests remain required before deployment. Generated Worker bundles must match their source modules.

## Activation blocker

The forecasting core is implemented for parallel production evaluation, not approved for live picks. Promotion requires new untouched prospective evidence, enough fixture-day and market-specific samples, improved paired Brier/log loss, trustworthy market comparisons and valid selection ROI. The present broader historical market-probability result fails that gate. The public model version must not be renamed to imply that this gate has passed.
