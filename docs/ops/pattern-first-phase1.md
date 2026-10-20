# Pattern-first football evidence — phase 1
This change adds last-five match evidence for each team across competitions, plus last-five at the relevant venue, to the existing getMatchEvidenceV1 response.
- Only final results that satisfy pre-kickoff evidence timing constraints in cleanEvidenceResults are included.
- Includes fixture IDs, competition IDs, kickoff timestamps, scorelines and observed indicators.
- Distinguishes counts from probability: 4/5 is an observed pattern, not a claim of 80% win probability.
- Samples smaller than 5 are explicit.
- Does not manufacture shots/xG where absent.
- Does not alter publication, probability floors, Bet365 quote verification or automatic picks yet.
Next phase: candidate ranking using observed patterns plus strength-of-opposition adjustment and calibrated price validation, tested against held-out results before publishing.
