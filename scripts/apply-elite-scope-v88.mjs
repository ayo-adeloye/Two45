import fs from "node:fs";
const path="worker.js";
let code=fs.readFileSync(path,"utf8");
const importLine='import { isEliteResearchFixture } from "./elite-slate-scope-v88.js";\n';
if(!code.includes(importLine.trim())){
  const tierImport='import { competitionTierV87 } from "./competition-tier-v87.js";\n';
  if(code.includes(tierImport)) code=code.replace(tierImport,tierImport+importLine);
  else code=importLine+code;
}
const oldText=`  const fixtures = arr(fixtureSnap?.fixtures)
    .filter(f => competitionTierV21(f?.league?.name, f?.league?.id) <= 2)
    .filter(f => !["CANC","PST","ABD","AWD","WO"].includes(String(f?.fixture?.status?.short || "").toUpperCase()));`;
const newText=`  const fixtures = arr(fixtureSnap?.fixtures)
    .filter(f => competitionTierV21(f?.league?.name, f?.league?.id) <= 2)
    .filter(f => isEliteResearchFixture(f));`;
if(!code.includes(newText)){
  if(!code.includes(oldText)) throw new Error("Elite fixture scope anchor missing");
  code=code.replace(oldText,newText);
}
fs.writeFileSync(path,code);
console.log("Future-only Elite slate scope integrated.");