const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
// Exercise the actual production source, not an independent reimplementation.
const source = fs.readFileSync(require('node:path').join(__dirname,'..','worker.js'),'utf8');
const start=source.indexOf('const snapshotPendingWritesV117 = new Map();');
const end=source.indexOf('__name(saveFeedSnapshot, "saveFeedSnapshot");',start);
assert.ok(start>0 && end>start, 'snapshot writer source found');
const pending=[];
const sb=(_env,path,options)=>new Promise((resolve,reject)=>pending.push({path,options,resolve,reject}));
const context={sb,Date,JSON,Map};
vm.createContext(context);
vm.runInContext(source.slice(start,end)+';globalThis.writeSnapshot=saveFeedSnapshot;',context);
const save=context.writeSnapshot;
async function drain(count){assert.equal(pending.length,count);const jobs=pending.splice(0);jobs.forEach(j=>j.resolve());await Promise.resolve();}
test('identical concurrent writes coalesce',async()=>{const a=save({},'model-analysis:a',{v:1},60),b=save({},'model-analysis:a',{v:1},60);await drain(1);await Promise.all([a,b]);});
test('different payloads do not conceal a third duplicate',async()=>{const a=save({},'model-analysis:b',{v:1},60),b=save({},'model-analysis:b',{v:2},60),c=save({},'model-analysis:b',{v:1},60);await drain(2);await Promise.all([a,b,c]);});
test('protected pacing writes never coalesce',async()=>{const a=save({},'api-football-pacing',{v:1},60),b=save({},'api-football-pacing',{v:1},60);await drain(2);await Promise.all([a,b]);});
test('failure permits another attempt',async()=>{const a=save({},'match-intelligence:c',{v:1},60);assert.equal(pending.length,1);pending.shift().reject(Error('failed'));await assert.rejects(a);const b=save({},'match-intelligence:c',{v:1},60);await drain(1);await b;});
