import fs from 'node:fs';
const file=new URL('../worker.js',import.meta.url);
const source=fs.readFileSync(new URL('../model-review-runtime-v1.js',import.meta.url),'utf8').replace(/\r\n/g,'\n');
const block='// BEGIN MODEL REVIEW RUNTIME V1\n'+source+'\n// END MODEL REVIEW RUNTIME V1\n';
const worker=fs.readFileSync(file,'utf8').replace(/\r\n/g,'\n').replace(/\/\/ BEGIN MODEL REVIEW RUNTIME V1[\s\S]*?\/\/ END MODEL REVIEW RUNTIME V1\n/g,'');
fs.writeFileSync(file,block+worker);
