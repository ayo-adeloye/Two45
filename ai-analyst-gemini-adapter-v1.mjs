// Gemini free-tier adapter. Requires an injected fetch implementation and a secret key.
// No secrets are logged or persisted. Never call this from browser code.
import { validateAnalystOutput } from "./ai-analyst-shadow-v1.mjs";
export async function invokeGeminiFree({ apiKey, model, prompt, maxOutputTokens = 1200, fetchImpl = fetch }) {
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");
  if (model !== "gemini-2.5-flash-lite") throw new Error("Free pilot model is restricted");
  const endpoint = "https://generativelanguage.googleapis.com/v1beta/models/" +
    encodeURIComponent(model) + ":generateContent";
  const response = await fetchImpl(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json", maxOutputTokens,
        temperature: 0.2, thinkingConfig: { thinkingBudget: 0 } }
    })
  });
  if (!response.ok) throw new Error("Gemini request failed (HTTP " + response.status + ")");
  const data = await response.json();
  const raw = data?.candidates?.[0]?.content?.parts?.map(p => p.text || "").join("");
  if (!raw) throw new Error("Gemini returned no text");
  let parsed;
  try { parsed = JSON.parse(raw); } catch { throw new Error("Gemini returned invalid JSON"); }
  return { data: validateAnalystOutput(parsed),
    inputTokens: data?.usageMetadata?.promptTokenCount || 0,
    outputTokens: data?.usageMetadata?.candidatesTokenCount || 0,
    freeTier: true // Free-only configuration is asserted by caller; API does not attest billing tier.
  };
}
