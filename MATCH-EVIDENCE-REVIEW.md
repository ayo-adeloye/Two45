# Deeper match evidence review

The founder review and fixture analysis now include a structured market dossier. A withheld selection is shown as **No qualified selection**, with no invented 0% win probability or Elite score. A queued request remains a review in progress.

## What it examines

- Last eight observed same-league, same-season regulation results for each team, plus separate home and away venue samples. Counts and missing values remain visible.
- Goals for/against and points per match, completed matches in the preceding 14 days, and the gap from the latest completed kickoff. This gap is not a verified full rest schedule; unplayed intermediate fixtures are not inferred.
- One comparison per core market family, preserving the existing primary selection when there is one. Each comparison includes the retained model probability, fresh exact Bet365 quote, price break-even probability, estimated return, applicable Elite requirements and rejection reasons.
- A sensitivity scenario subtracting five percentage points from the model probability. This is a stress scenario, not a measured uncertainty bound or a new calibrated forecast.
- Venue-specific historical event frequencies and Wilson 95% intervals where the regulation-score labels support the exact event. These describe past samples, not the win probability of this fixture. Unsupported markets remain missing.
- Independent-model comparison through the existing conservative review policy. Weak independent evidence is labelled insufficient, rather than displaying its raw estimate as credible support. A founder review respects an independent HOLD and saves the same rejected review status.
- Confirmed-lineup status, injury-report coverage, source failures and absent observed xG. Unknown injuries do not mean no absences; model goal expectations are explicitly not observed xG.

## Point-in-time safeguards

Only results available by the review time are used. The current fixture, future labels, missing/null scores, ambiguous duplicate fixtures, known result conflicts and extra-time labels are excluded. Failure to read the conflict store invalidates the history input and is exposed. Same-league and season filters prevent silently mixing competitions or old seasons in the descriptive form samples.

History reads are capped at 160 and report a cap hit. Quote observation and provider timestamps are retained; cached dossiers expire within five minutes and are invalidated if the fixture starts or a price expires. A dossier's `asOf` is its review time, not a reconstruction of an earlier pre-match forecast.

## Routine and scope

The normal scheduled cycle refreshes one upcoming canonical Tier 1 dossier per run, after existing production work, without making provider calls. A fixture detail or founder request can build an available upcoming fixture dossier on demand. `/api/match-evidence?fixtureId=...` serves this evidence, with a five-minute cache; only existing upcoming jobs within 72 hours can be reviewed. Source data is retained football research and existing prices, not private founder-account information.

The optimized server-side reader, `two45_match_evidence_inputs_v1`, projects only the fixture's price rows and relevant model/history fields in one transaction. It uses `SECURITY INVOKER`, with execution revoked from public/anon/authenticated and granted only to service_role. The Worker serves the resulting non-private football evidence. Supporting home/away history indexes avoid broad scans. Input failures remain visible and a failed cached review retries after 20 seconds. The SQL source and generated migration are tracked; this database migration is applied separately from the Worker deployment. Rolling back the Worker can leave this read-only helper in place without affecting publication or settlement.

This layer does not originate picks, boost probabilities, alter official publication gates or retroactively change tickets. Historical rates and narrative interpretation must not be substituted for the frozen independent model's validation. The raw model still requires accuracy, exact-price prospective-return and settlement-cutover validation. Player markets remain in their separate unvalidated research path.

## Verification and rollback

Tests cover temporal boundaries, duplicates/conflicts, missing statistics, venue alignment, small-sample uncertainty, threshold parity with actual Elite gates, price sensitivity, provider-call exclusion, official-write isolation, founder HOLD consistency, UI escaping and stale modal responses. Existing publication, Elite, Ladder and Record checks remain required. Revert this release to disable the dossier, preserving existing research snapshots, ticket locks and publication history.
