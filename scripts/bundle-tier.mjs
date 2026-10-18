import fs from 'node:fs';
const path=new URL('../worker.js',import.meta.url);
const source=fs.readFileSync(new URL('../competition-tier-v87.js',import.meta.url),'utf8').replace(/\r\n/g,'\n').replace(/^export /gm,'');
let worker=fs.readFileSync(path,'utf8').replace(/\r\n/g,'\n');
const start=worker.indexOf('// competition-tier-v87.js\n'),end=worker.indexOf('// elite-slate-scope-v88.js',start);
if(start<0||end<0)throw Error('Tier bundle anchors missing');
fs.writeFileSync(path,worker.slice(0,start)+'// competition-tier-v87.js\n'+source+'\n'+worker.slice(end));
