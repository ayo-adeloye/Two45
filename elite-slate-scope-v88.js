const UPCOMING = new Set(["NS","TBD"]);

export function isEliteResearchFixture(fixture, nowMs = Date.now()) {
  const status = String(fixture?.fixture?.status?.short || "").toUpperCase();
  const kickoffMs = Date.parse(fixture?.fixture?.date || "");
  if (!UPCOMING.has(status)) return false;
  if (!Number.isFinite(kickoffMs)) return false;
  return kickoffMs > Number(nowMs);
}
