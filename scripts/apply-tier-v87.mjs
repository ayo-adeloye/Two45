import fs from "node:fs";

const path = "worker.js";
let code = fs.readFileSync(path, "utf8");

const importLine = 'import { competitionTierV87 } from "./competition-tier-v87.js";\n';
if (!code.includes(importLine.trim())) {
  const eliteImport = 'import { buildEliteSlateReview } from "./elite-intelligence-v86.js";\n';
  if (code.startsWith(eliteImport)) code = eliteImport + importLine + code.slice(eliteImport.length);
  else code = importLine + code;
}

const oldFn = `function competitionTierV21(value, leagueId) {
  const n = String(value || "").toLowerCase();
  const id = Number(leagueId);
  if (MAJOR_LEAGUES_V19.has(id) || /champions league|la liga|serie a|bundesliga|ligue 1|world cup|uefa nations league|nations league|copa america|africa cup of nations|afcon/.test(n)) return 1;
  if (/world cup qualif|world cup qualifiers|euro qualif|european championship qualif|europa league|conference league|copa libertadores|libertadores|copa sudamericana|sudamericana|eredivisie|primeira liga|brasileir|liga profesional|argentina|mls|asian cup|afc|caf|concacaf/.test(n)) return 2;
  if (/scottish premiership|belgian pro league|swiss super league|austrian bundesliga|super lig|liga mx|saudi pro league|international|friendl/.test(n)) return 3;
  return 4;
}`;

const newFn = `function competitionTierV21(value, leagueId) {
  return competitionTierV87(value, leagueId);
}`;

if (!code.includes(newFn)) {
  if (!code.includes(oldFn)) throw new Error("competitionTierV21 anchor missing");
  code = code.replace(oldFn, newFn);
}

fs.writeFileSync(path, code);
console.log("Strict competition tier classifier integrated.");
