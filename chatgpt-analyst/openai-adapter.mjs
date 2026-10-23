// Two45 ChatGPT Analyst V1: guarded OpenAI inference adapter.
// This module does not publish tickets or change production schedules.
export const ANALYST_MODEL = "gpt-5-nano"; // low-cost supported API model; override only after verified pricing
export const MONTHLY_BUDGET_USD = 10;
const INPUT_PER_MILLION_USD = 0.05;
const OUTPUT_PER_MILLION_USD = 0.40;

export function estimateCostUsd(inputTokens, outputTokens) {
  return (Math.max(0, Number(inputTokens) || 0) * INPUT_PER_MILLION_USD +
    Math.max(0, Number(outputTokens) || 0) * OUTPUT_PER_MILLION_USD) / 1_000_000;
}

export async function analyzeWithOpenAI({ apiKey, fixture, availableQuotes, budgetRemainingUsd, fetchImpl = fetch }) {
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");
  if (!fixture || !Array.isArray(availableQuotes)) throw new Error("Fixture and quotes are required");
  // Reserve a conservative per-call maximum before making a billable request.
  const maxOutputTokens = 1100;
  const serialized = JSON.stringify({fixture, availableQuotes});
  if (serialized.length > 16000) throw new Error("Analysis input exceeds safe size limit");
  const estimatedInputTokens = Math.ceil((serialized.length + 1800) / 3);
  const reservedUsd = estimateCostUsd(estimatedInputTokens, maxOutputTokens);
  if (!Number.isFinite(budgetRemainingUsd) || budgetRemainingUsd < reservedUsd) {
    throw new Error("Analyst monthly budget guard prevented API request");
  }
  const response = await fetchImpl("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {"Authorization": "Bearer " + apiKey, "Content-Type": "application/json"},
    body: JSON.stringify({
      model: ANALYST_MODEL,
      max_output_tokens: maxOutputTokens,
      store: false,
      input: [
        {role:"system",content:"You are Two45's football analyst. Evaluate only the supplied fixture and exact available bookmaker quotes. Do not invent markets, prices, statistics or facts. Prefer no recommendation to unsupported certainty. Respond with a compact JSON object containing fixtureId, recommendation (marketId, selection, bookmaker, odds) or null, confidence (0-100), and reasoning. Prices are snapshots, not guaranteed live prices."},
        {role:"user",content:serialized}
      ]
    }),
    signal: AbortSignal.timeout(20000)
  });
  if (!response.ok) throw new Error("OpenAI inference failed with HTTP " + response.status);
  const payload = await response.json();
  const outputText = (payload.output || []).flatMap(item => item.content || [])
    .filter(item => item.type === "output_text").map(item => item.text).join("");
  if (!outputText) throw new Error("OpenAI returned no text");
  let draft;
  try { draft = JSON.parse(outputText); }
  catch { throw new Error("OpenAI output was not valid JSON"); }
  return {draft, model:ANALYST_MODEL, usage:payload.usage || null,
    estimatedActualCostUsd:estimateCostUsd(payload.usage?.input_tokens, payload.usage?.output_tokens),
    publishable:false};
}
