# Two45 AI Analyst V1 — shadow implementation

This is an isolated module, not connected to the live Worker or public picks. No API calls, wagers, or production database mutations are performed automatically.

## Price benchmark (USD per million tokens, standard text API)
- Gemini 2.5 Flash-Lite: input $0.10, output $0.40.
- OpenAI GPT-6 Luna: input $0.10, output $0.50.
- OpenAI GPT-5 mini: input $0.25, output $2.00.

At 5,000 input + 1,000 output tokens per match, estimated API charges are $0.0009 for Gemini Flash-Lite, $0.0010 for Luna, and $0.00325 for GPT-5 mini. These are *price comparisons*, not a quality benchmark. A real quality benchmark requires API credentials, identical dated football evidence, blind grading, token usage, and subsequent outcomes.

## Safety and design
- `shortlist()` screens supplied match/market evidence; no LLM cost.
- `runShadow()` accepts a provider adapter, monthly ledger, and fixtures; no provider credentials stored here.
- Hard-coded $15 budget, with per-call reservation and actual token accounting. Persist the ledger transactionally before parallel execution in production; the in-memory ledger is only suitable for single-process pilot testing.
- The output has `shadow:true` and `publicationEligible:false` unconditionally.
- Price verification requires exact Bet365 market/selection, provider update and observation timestamps <=15 minutes, and future kickoff.
- No fabricated quote fallback, no automatic picks, no changes to existing model board.
- Errors are isolated per fixture.

## Tests
`node --test ai-analyst-shadow-v1.test.mjs`

## Next integration gate
Implement real Gemini/OpenAI adapters, durable budget accounting in Supabase, curated evidence packs, and paired fixture evaluations. Do not wire to production cron until quality and integrity tests pass. The cheaper provider is provisionally Gemini Flash-Lite; measured analyst performance has **not** been benchmarked yet.
