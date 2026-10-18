import fs from 'node:fs';
const file=new URL('../worker.js',import.meta.url),module=new URL('../forecast-core-v3.mjs',import.meta.url);
const source=fs.readFileSync(module,'utf8').replace(/\r\n/g,'\n').replace(/^export /gm,'');
const block='// BEGIN GENERATED FORECAST CORE V3\nvar forecastCoreV3 = (() => {\n'+source+'\nreturn {CORE_VERSION,fitGoalModel,predictGoals,seasonFeatures,attachSeasonHistory};\n})();\n// END GENERATED FORECAST CORE V3\n';
let worker=fs.readFileSync(file,'utf8').replace(/\r\n/g,'\n').replace(/\/\/ BEGIN GENERATED FORECAST CORE V3[\s\S]*?\/\/ END GENERATED FORECAST CORE V3\n/g,'');
fs.writeFileSync(file,block+worker);
