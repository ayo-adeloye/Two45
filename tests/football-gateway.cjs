const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const old=fs.readFileSync(path.join(__dirname,'../lab/gateway/two45-football-gateway-v4.ts'),'utf8');
const source=fs.readFileSync(path.join(__dirname,'../supabase/functions/two45-football-gateway/index.ts'),'utf8');
assert.equal(source.replace('  "fixtures/players",\n',''),old,'Gateway change must only add the required player-statistics endpoint');
let handler,calls=[];
const c=vm.createContext({console,URL,Response,Request,Headers,AbortSignal,DOMException,Deno:{serve:fn=>handler=fn},fetch:async(target,options)=>{calls.push({target,options});return Response.json({response:[]});}});
vm.runInContext(source.replace(/^import .*;\n/,'').replace('req: Request','req').replace('let upstream: Response;','let upstream;'),c);
const request=(endpoint,credential=true)=>new Request('https://gateway.test',{method:'POST',headers:{'Content-Type':'application/json',...(credential?{'x-apisports-key':'test-provider-key'}:{})},body:JSON.stringify({endpoint,params:{fixture:1570420}})});
(async()=>{
 let r=await handler(request('fixtures/players',false));assert.equal(r.status,401);assert.equal(calls.length,0);
 r=await handler(request('fixtures/players'));assert.equal(r.status,200);assert.equal(calls.length,1);assert.equal(calls[0].target,'https://v3.football.api-sports.io/fixtures/players?fixture=1570420');
 r=await handler(request('arbitrary-endpoint'));assert.equal(r.status,400);assert.equal(calls.length,1);
 r=await handler(request('fixtures/lineups'));assert.equal(r.status,200);assert.equal(calls.length,2);
 r=await handler(new Request('https://gateway.test'));assert.equal(r.status,405);
 console.log('PASS: additive gateway endpoint, provider credential requirement, fixed upstream, unsupported endpoint denial and existing lineup route');
})().catch(e=>{console.error(e);process.exitCode=1;});
