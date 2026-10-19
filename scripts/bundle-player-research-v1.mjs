import fs from 'node:fs';
const file=new URL('../worker.js',import.meta.url);
let worker=fs.readFileSync(file,'utf8').replace(/\r\n/g,'\n').replace(/\/\/ BEGIN GENERATED PLAYER RESEARCH V1[\s\S]*?\/\/ END GENERATED PLAYER RESEARCH V1\n/g,'');
const pure=fs.readFileSync(new URL('../player-props-v1.mjs',import.meta.url),'utf8').replace(/^export /gm,'');
const runtime=fs.readFileSync(new URL('../player-research-runtime-v1.js',import.meta.url),'utf8');
const block='// BEGIN GENERATED PLAYER RESEARCH V1\nvar playerPropsV1 = (()=>{\n'+pure+'\nreturn {PLAYER_RESEARCH_VERSION,PLAYER_MARKETS,isPlayerMarket,normalizePlayerStats,forecastPlayerProp};\n})();\n'+runtime+'\n// END GENERATED PLAYER RESEARCH V1\n';
if(!worker.includes('result.playerResearch ='))worker=worker.replace('  result.providerBurst = {','  if (minute % 15 === 0) {\n    try { result.playerResearch = pendingBacklog ? {skipped:true,reason:"PRODUCTION_BACKLOG_FIRST"} : await runPlayerResearchV1(env); }\n    catch(e) { result.playerResearch = {ok:false,error:safeRefreshError(e)}; }\n  }\n  result.providerBurst = {');
worker=worker.replace('result.playerResearch = await runPlayerResearchV1(env);','result.playerResearch = pendingBacklog ? {skipped:true,reason:"PRODUCTION_BACKLOG_FIRST"} : await runPlayerResearchV1(env);');
worker=worker.replace('  if (minute % 15 === 0) {\n    try { result.playerResearch','  { // Research checks its own cadence, including the first run after deployment.\n    try { result.playerResearch');
if(!worker.includes('url.pathname === "/api/player-research"'))worker=worker.replace('      if (url.pathname === "/api/health/forecast-core") {','      if (url.pathname === "/api/player-research") {\n        return json({ok:true,mode:"RESEARCH_ONLY",promotionAllowed:false,status:(await getFeedSnapshot(env,"player-research-v1:status"))?.payload||null});\n      }\n      if (url.pathname === "/api/health/forecast-core") {');
const needle='function providerMarketName(name) {\n';
if(!worker.includes('playerPropsV1.isPlayerMarket(name)'))worker=worker.replace(needle,needle+'  if (playerPropsV1.isPlayerMarket(name)) return null; // Player identities cannot enter team-total markets.\n');
// Retain raw player prices for research even though official team-market parsing rejects them.
if(!worker.includes('playerPropsV1.isPlayerMarket(b?.name)'))worker=worker.replace(') || providerMarketName(\n            b?.name',') || playerPropsV1.isPlayerMarket(b?.name) || providerMarketName(\n            b?.name');
worker=worker.replace(/(?:playerPropsV1\.isPlayerMarket\(b\?\.name\) \|\| ){2,}/g,'playerPropsV1.isPlayerMarket(b?.name) || ');
fs.writeFileSync(file,block+worker);
