import fs from 'node:fs';
const worker=new URL('../worker.js',import.meta.url),runtime=new URL('../forecast-core-runtime-v3.js',import.meta.url);
let source=fs.readFileSync(worker,'utf8').replace(/\r\n/g,'\n');
const block='// BEGIN FORECAST CORE RUNTIME V3\n'+fs.readFileSync(runtime,'utf8').replace(/\r\n/g,'\n')+'\n// END FORECAST CORE RUNTIME V3\n';
source=source.replace(/\/\/ BEGIN FORECAST CORE RUNTIME V3[\s\S]*?\/\/ END FORECAST CORE RUNTIME V3\n/g,'');
source=block+source;
if(!source.includes('analysis.goalCoreV3 = await recordGoalForecastV3')) {
 const needle='        const candidates = selectionV2.generateCandidates(analysis,quotes,calibrationRow?.payload,context);';
 if(!source.includes(needle))throw Error('Shadow integration point not found');
 source=source.replace(needle,`        try { analysis.goalCoreV3 = await recordGoalForecastV3(env,job,analysis,quotes,decision); }
        catch(e) { analysis.goalCoreV3 = {mode:"SHADOW",error:safeRefreshError(e)}; console.error("goal-core-v3 shadow failed",analysis.goalCoreV3.error); }
`+needle);
}
source=source.replace('recordGoalForecastV3(env,job,analysis,quotes);','recordGoalForecastV3(env,job,analysis,quotes,decision);');
if(!source.includes('result.forecastCoreTraining =')) {
 const needle='  // V115 egress guard: learning is settlement-driven below (every 15 minutes).';
 if(!source.includes(needle))throw Error('Scheduled training integration point not found');
 source=source.replace(needle,`  result.forecastCoreTraining = await refreshGoalCoreV3(env);
`+needle);
}
if(!source.includes('url.pathname === "/api/health/forecast-core"')) {
 const needle='      if (url.pathname === "/api/health/analysis") {';
 source=source.replace(needle,`      if (url.pathname === "/api/health/forecast-core") {
        return json({ok:true,status:await sb(env,"rpc/two45_goal_status_v3",{method:"POST",body:"{}"}),training:(await getFeedSnapshot(env,"forecast-core-v3:training-status").catch(()=>null))?.payload||null});
      }
`+needle);
}
if(!source.includes('result.forecastCoreSweep =')) {
 source=source.replace('  result.forecastCoreTraining = await refreshGoalCoreV3(env);','  result.forecastCoreTraining = await refreshGoalCoreV3(env);\n  result.forecastCoreSweep = await runGoalCoreSweepV3(env);');
}
source=source.replaceAll('selectionVersion: selectionV2.VERSION,','forecastCoreVersion: forecastCoreV3.CORE_VERSION,\n          forecastCoreMode: "SHADOW",\n          selectionVersion: selectionV2.VERSION,');
// Idempotency across regenerations.
source=source.replace(/(forecastCoreVersion: forecastCoreV3.CORE_VERSION,\n          forecastCoreMode: "SHADOW",\n          )+/g,'forecastCoreVersion: forecastCoreV3.CORE_VERSION,\n          forecastCoreMode: "SHADOW",\n          ');
fs.writeFileSync(worker,source);
