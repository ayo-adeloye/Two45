# Independent selection v2 rollout — October 17, 2026 Eastern

## Production behavior

The public Record uses `two45_publications`, not `two45_model_forecasts`. Only Elite 3, High Conviction, Weekend Ladder and published Founder selections qualify. Selection identity is fixture + market + normalized selection; repeat product membership is retained separately, and the public aggregate counts each distinct selection once at its first publication price. Alternative markets nested inside a publication snapshot do not become records.

Locked daily/weekend snapshot writes and Founder publishing create permanent publication evidence. Historical backfill uses retained locked ticket snapshots (including archived versions) and published Founder rows only. Verified High Conviction selections are captured before being returned publicly. No historical High Conviction publication is inferred from a research decision. Publications, research forecasts, baseline metrics and settlement audit receipts remain available; service-role publication updates/deletes are not granted.

The former Record summary was captured in `two45_record_baselines`: 941 research rows, 588 wins, 265 losses, 85 pending, +701.24 nominal units at capture. The user-reported 935/588/264/80 preceded this capture. These changing figures were not evidence of 935 official selections. The new ledger initially reconstructed 50 distinct selections from 77 product memberships. The difference reflects repeated published membership, not lost forecast rows.

Score markets are independently graded against non-conflicting settled fixture scores. Founder card results use the existing specialized Founder settlement. Unknown stats outcomes stay pending. Publication-price profit is one unit per distinct selection; this is not accumulator ticket ROI. `/api/record/report` exposes market breakdowns, ROI denominator, product membership counts, and the legacy baseline.

## Elite diagnosis and corrections

The October 17 retained lock reported 227 analyzed fixtures, 12 exact-priced candidates, zero Elite-qualified legs, and `ELITE_QUALITY`. Odds paging was complete; waiting for the overall odds feed was not the immediate blocker.

An alternative was merged with its headline pick without replacing inherited `valueEdgePct`. Exact Bet365 price verification then left that stale edge in place. Each candidate now recomputes both fractional and percentage-point edge fields from its own independent probability and verified price. The magnitude-based unit heuristic also turned a 0.95 percentage-point edge into 95%; explicit field units replace it in scores and explanations.

After deployment, the active October 18 slate had nine priced candidates. The corrected edges removed false non-positive-value rejections, but all nine still failed the unchanged confidence-score gate; some also failed probability, data-quality, or price floors. No ticket was forced. Daily lock diagnostics include each candidate's fixture, market, selection, price, probability, edge, confidence score and rejection reasons.

Weekend construction reserves Elite fixtures for both Saturday and Sunday. Existing distinct-fixture and cross-rung exclusion remains, with a disjoint-rung regression. Invalid prior-lock date/revision cannot contaminate construction. The dated October 17 reset cannot replay. Retained publications are never erased by rebuilding a snapshot.

## V2 is shadow-only

`selection-v2.mjs` accepts independently generated probabilities before seeing prices. It applies market + selection/line + model-version calibration fitted only to outcomes settled before the training cutoff. It requires exact, fresh, unambiguous Bet365 quotes, sample and feature freshness, Tier 1/2 identity, evidence quality, supported settlement, and positive uncertainty-adjusted expected value. It selects one primary per fixture, then optimizes products within genuine odds bounds and explicit fixture reservations. It abstains when a target cannot be achieved.

Every processed pre-match fixture can write an immutable `two45_selection_shadow_v2` observation containing input features and their timestamp, all probabilities, quotes and timestamps, every candidate/rejection, the primary selection, and the legacy research decision. The production health response advertises `selectionMode: SHADOW`. There is deliberately no activation switch in this release. The existing v1.9 research probability generator remains the production foundation; this release does not claim a validated replacement of that raw forecasting core.

`two45_settlement_audit_v2` preserves existing settlement baselines and before/after states for subsequent forecast and Founder settlement changes. Missing pre-rollout revisions cannot be recovered retroactively.

## Reproducible validation

Run:

```text
node selection-v2.test.mjs
node shadow-evaluation-v2.test.mjs
node tests/publication-v2.cjs
node tests/record-ask.cjs
node tests/tightening.cjs
node tests/weekend-lock.mjs
node scripts/evaluate-v2.mjs forecasts.json report.json
```

The historical export contained 2,005 rows across 1,574 fixtures. There were 240 post-kickoff-created rows and 44 duplicate fixture/market/selection groups before version-specific deduplication. After pre-match filtering and duplicate isolation, 1,599 settled observations remained. The chronological holdout starts October 7 UTC, contains 571 observations, and has 267 paired priced observations with a stored market benchmark.

| Diagnostic on the same paired cohort | Brier | Log loss |
| --- | ---: | ---: |
| Original probability | 0.214717 | 0.625699 |
| Market/line calibrated probability | 0.213526 | 0.621947 |
| Stored legacy market probability, untrusted normalization | 0.222834 | 0.638544 |

Nominal ROI on that same priced cohort is -0.64%. Calibration variants score the same historical wagers, so equal ROI is not a comparison of selection strategies. Legacy provider-group normalization may combine distinct lines; the stored market benchmark must not be used to claim market superiority. Historical prices lack immutable exact-tuple quote timestamps, and the full point-in-time candidate universe was not retained. A valid retrospective strategy or ticket ROI comparison cannot be manufactured from this data.

The prospective exporter is `scripts/export-shadow-v2.sql`; run `node scripts/evaluate-shadow-v2.mjs shadow-export.json report.json`. Its predeclared decision rule freezes the latest snapshot at least one hour before kickoff, one primary per fixture, and independently grades supported markets. It reports selected-strategy ROI, legacy research-strategy ROI where priced, paired raw/calibrated/complete same-line market Brier and log loss, and market-specific results. Promotion remains blocked pending sufficient prospective settled observations, frozen holdout review, and fixture-day block confidence intervals. Missing benchmarks or outcomes are explicit exclusions.

## Data quality and remaining blockers

- Feature audit at capture: 3,089 team snapshots; 1,879 below eight matches; no missing `as_of` or empty raw payloads. All 3,089 structured `xg_for_avg` columns were unpopulated. This does not prove every raw provider field lacks xG; it means structured xG coverage cannot be assumed. V2 records actual consumed features and rejects inadequate samples.
- The modest historical calibration improvement does not validate profitable selection, prove statistical significance, or justify changing production model weights or loosening Elite thresholds.
- Historical official High Conviction coverage is incomplete because there was no durable publication event. The public notice states the coverage limit. Research forecasts remain separate and intact.
- Some historical published corner/stat lines remain pending without independently verifiable statistics. They are neither silently marked losses nor counted as wins.
- The base raw probability model has not been replaced with a validated new xG/lineup/strength model. Reliable point-in-time features and prospective holdouts are required for that promotion.
- Existing Supabase advisor warnings on older SECURITY DEFINER functions were observed. New publication writes are service-only; broad unrelated access changes were not bundled into this rollout.

## Deployment and rollback

PR 6 introduced the ledger/shadow rollout; PR 7 corrected alternative edge inheritance. Deployment runs regressions before Worker and Pages promotion. Public health, Record summary/history/report, Elite diagnostics, mobile Record rendering, and shadow inserts were checked against production. The direct Cloudflare connector returned invalid-auth-header errors; the existing GitHub deployment integration succeeded.

Roll back Worker/Pages source through a new reviewed revert commit if needed. Preserve all additive database tables and receipts. Do not restore research-based counts as the official Record. Model activation is a separate future change after validation, not part of this reporting deployment.
