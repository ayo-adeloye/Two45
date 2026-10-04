import { isEliteResearchFixture } from "./elite-slate-scope-v88.js";

const now = Date.parse("2026-10-04T22:45:00Z");
const f = (date,status="NS") => ({fixture:{date,status:{short:status}}});

const cases = [
  [f("2026-10-04T23:00:00Z"), true, "future NS"],
  [f("2026-10-05T02:00:00Z","TBD"), true, "future TBD"],
  [f("2026-10-04T20:00:00Z"), false, "past NS snapshot"],
  [f("2026-10-04T23:00:00Z","FT"), false, "finished"],
  [f("2026-10-04T23:00:00Z","1H"), false, "live"],
  [f("bad-date"), false, "bad kickoff"]
];

for (const [fixture,want,label] of cases) {
  const got = isEliteResearchFixture(fixture,now);
  if (got !== want) throw new Error(`${label}: expected ${want}, got ${got}`);
}
console.log(JSON.stringify({ok:true,cases:cases.length}));
