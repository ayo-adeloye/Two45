import { competitionTierV87 } from "./competition-tier-v87.js";

const cases = [
  ["UEFA Nations League",5,1],
  ["Premier League",39,1],
  ["Mongolia Premier League",9999,4],
  ["2. Frauen Bundesliga",9999,3],
  ["Frauen Bundesliga",9999,2],
  ["Serie A Women",9999,2],
  ["Liga Premier Serie A",9999,4],
  ["Friendlies",10,3],
  ["MLS",253,2],
  ["Eredivisie",88,2],
  ["Liga MX",262,3],
  ["Serie B",136,2],
  ["USL Championship",255,2],
  ["NPFL",399,2],
  ["UEFA U21 Championship Qualification",850,2],
  ["CAF U23 Cup of Nations",1015,2],
  ["UEFA U19 Championship",9999,3],
  ["Liga Profesional Argentina",9999,2],
  ["CONCACAF Nations League",536,1]
];

for (const [name,id,want] of cases) {
  const got = competitionTierV87(name,id);
  if (got !== want) throw new Error(`${name} (${id}) expected Tier ${want}, got Tier ${got}`);
}
console.log(JSON.stringify({ok:true,cases:cases.length}));
