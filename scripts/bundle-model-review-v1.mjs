import fs from 'node:fs';
const file=new URL('../worker.js',import.meta.url);
const source=fs.readFileSync(new URL('../model-review-v1.mjs',import.meta.url),'utf8').replace(/\r\n/g,'\n').replace(/^export /gm,'');
const block='// BEGIN GENERATED MODEL REVIEW V1\nvar modelReviewV1 = (() => {\n'+source+'\nreturn {REVIEW_VERSION,compareModelPick,summarizeReviews};\n})();\n// END GENERATED MODEL REVIEW V1\n';
const worker=fs.readFileSync(file,'utf8').replace(/\r\n/g,'\n').replace(/\/\/ BEGIN GENERATED MODEL REVIEW V1[\s\S]*?\/\/ END GENERATED MODEL REVIEW V1\n/g,'');
fs.writeFileSync(file,block+worker);
