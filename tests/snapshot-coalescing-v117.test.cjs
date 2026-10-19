const test = require('node:test');
const assert = require('node:assert/strict');
// Isolated behavioral regression tests for the V117 write coalescing contract.
function writer(sb) {
 const pending = new Map();
 const allowed = ['player-research-v1:', 'match-intelligence:', 'model-analysis:'];
 return async (key,payload,ttl) => {
  const write=()=>sb(key,payload,ttl);
  if(!allowed.some(x=>key.startsWith(x))){await write();return;}
  const signature=JSON.stringify([key,ttl,payload]);
  const previous=pending.get(key);
  if(previous?.signature===signature){await previous.promise;return;}
  const promise=write(),entry={signature,promise};pending.set(key,entry);
  try{await promise;}finally{if(pending.get(key)===entry)pending.delete(key);}
 };
}
const controlled=()=>{const writes=[];return {writes,save:writer(()=>new Promise((resolve,reject)=>writes.push({resolve,reject})))};};
test('same concurrent payload is one write',async()=>{const x=controlled();const a=x.save('model-analysis:1',{n:1},60),b=x.save('model-analysis:1',{n:1},60);assert.equal(x.writes.length,1);x.writes[0].resolve();await Promise.all([a,b]);});
test('different payloads each write',async()=>{const x=controlled();const a=x.save('model-analysis:1',{n:1},60),b=x.save('model-analysis:1',{n:2},60);assert.equal(x.writes.length,2);x.writes.forEach(w=>w.resolve());await Promise.all([a,b]);});
test('rate-limit state is excluded',async()=>{const x=controlled();const a=x.save('api-football-pacing',{n:1},60),b=x.save('api-football-pacing',{n:1},60);assert.equal(x.writes.length,2);x.writes.forEach(w=>w.resolve());await Promise.all([a,b]);});
test('failure clears in-flight state',async()=>{const x=controlled();const a=x.save('match-intelligence:1',{n:1},60);x.writes[0].reject(Error('database'));await assert.rejects(a);const b=x.save('match-intelligence:1',{n:1},60);assert.equal(x.writes.length,2);x.writes[1].resolve();await b;});
test('sequential writes are preserved',async()=>{const x=controlled();const a=x.save('model-analysis:1',{n:1},60);x.writes[0].resolve();await a;const b=x.save('model-analysis:1',{n:1},60);assert.equal(x.writes.length,2);x.writes[1].resolve();await b;});
