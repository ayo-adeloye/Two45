import fs from 'node:fs';
const file=new URL('../worker.js',import.meta.url);
let worker=fs.readFileSync(file,'utf8').replace(/\r\n/g,'\n').replace(/\/\/ BEGIN GENERATED VALIDATION ROUTINE V1[\s\S]*?\/\/ END GENERATED VALIDATION ROUTINE V1\n/g,'');
const evaluator=fs.readFileSync(new URL('./evaluate-shadow-v2.mjs',import.meta.url),'utf8').split("if(process.argv[1]?.endsWith")[0].replace(/^import .*;\r?\n/gm,'').replace(/^export /gm,'');
const runtime=fs.readFileSync(new URL('../model-validation-runtime-v1.js',import.meta.url),'utf8');
const block='// BEGIN GENERATED VALIDATION ROUTINE V1\nvar shadowEvaluationV1 = (()=>{\nconst {canonical,scoreRows}=selectionV2;\n'+evaluator+'\nreturn {evaluate};\n})();\n'+runtime+'\n// END GENERATED VALIDATION ROUTINE V1\n';
// Evaluate after the selection bundle initializes and keep the Worker export last.
if(!worker.includes('result.modelValidation ='))worker=worker.replace('  result.providerBurst = {','  if (minute % 15 === 0) {\n    try { result.modelValidation = await runModelValidationV1(env); }\n    catch(e) { result.modelValidation = {ok:false,error:safeRefreshError(e)}; }\n  }\n  result.providerBurst = {');
if(!worker.includes('url.pathname === "/api/model-validation"'))worker=worker.replace('      if (url.pathname === "/api/player-research") {','      if (url.pathname === "/api/model-validation") {\n        return json({ok:true,promotionAllowed:false,status:(await getFeedSnapshot(env,"model-validation-v1:status"))?.payload||null});\n      }\n      if (url.pathname === "/api/player-research") {');
if(!worker.includes('var worker_default = {'))throw Error('Worker entrypoint not found');
fs.writeFileSync(file,worker.trimEnd().replace('var worker_default = {',block+'var worker_default = {')+'\n');
