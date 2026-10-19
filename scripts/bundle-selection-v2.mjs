import fs from 'node:fs';
const file=new URL('../worker.js',import.meta.url),module=new URL('../selection-v2.mjs',import.meta.url);
const source=fs.readFileSync(module,'utf8').replace(/\r\n/g,'\n').replace(/^export /gm,'');
const block='// BEGIN GENERATED SELECTION V2\nvar selectionV2 = (() => {\n'+source+'\nreturn {VERSION,generateCandidates,primaryPicks,optimizeProduct,canonical,scoreRows};\n})();\n// END GENERATED SELECTION V2\n';
let worker=fs.readFileSync(file,'utf8').replace(/\r\n/g,'\n');
worker=worker.replace(/\/\/ BEGIN GENERATED SELECTION V2[\s\S]*?\/\/ END GENERATED SELECTION V2\n/g,'');
fs.writeFileSync(file,block+worker);
