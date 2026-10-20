import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// Execute the production functions with storage and board inputs isolated.
const source = fs.readFileSync(new URL('../worker.js', import.meta.url), 'utf8');
const ctx = vm.createContext({ console, URL, Intl, Date, setTimeout, clearTimeout });
vm.runInContext(source.replace(/export\s*\{\s*worker_default as default\s*\};/, ''), ctx);
let pool = [], saved, daily = null;
ctx.ticketBoardV70 = async () => ({});
ctx.ticketPoolBoardVerifiedV78 = (_board, day) => day === 'Sat' ? pool : [];
ctx.getFeedSnapshot = async (_env, key) => key.startsWith('ticket-lock:daily:') ? daily : null;
ctx.ticketBaselineV70 = async () => ({});
ctx.saveFeedSnapshot = async (_env, key, payload) => { saved = payload; };
const leg = (id, odds) => ({ fixtureId:id, _ticketOdds:odds, sportsbookOdds:odds, _ticketScore:.85, competitionTier:1 });
const build = previous => ctx.buildWeekendLockV70({}, '2026-10-17', null, previous);
// Without independent approval, the ladder must remain unpublished.
pool = [leg(1,2.2),leg(2,2.2)];
const unreviewed = await build();
assert.equal(unreviewed.status,'BUILDING');
assert.equal(unreviewed.tickets.five,null);
ctx.reviewModelPoolV1 = async(_env,picks)=>({pool:picks.map(p=>({...p,modelReview:{status:'SUPPORTS',hold:false}})),holds:[],summary:{counts:{SUPPORTS:picks.length,DIFFERS:0,HOLD:0,UNREVIEWED:0}}});

pool = [leg(1,2.2), leg(2,2.2), leg(3,2.15), leg(8,2.15), leg(9,2.15)];
const partial = await build();
assert.equal(partial.status, 'PARTIAL');
assert.equal(partial.tickets.five.targetMet, true);
assert.equal(partial.tickets.ten.targetMet, true);
assert.equal(partial.tickets.fifty, null, 'out-of-target fallback must never publish');
assert.equal(partial.immutable, false);
assert.equal(partial.lockedAt, null);
assert.equal(saved, partial);
assert(!partial.tickets.five.legs.some(x=>partial.tickets.ten.legs.some(y=>String(x.fixtureId)===String(y.fixtureId))));

pool = [];
const refresh = await build(partial);
assert.equal(refresh.tickets.five, partial.tickets.five, 'retain original legs, odds and lock timestamp');
assert.equal(refresh.tickets.ten, partial.tickets.ten);
assert.equal(refresh.status, 'PARTIAL');

pool = [leg(4,2.7),leg(5,2.7),leg(6,2.7),leg(7,2.7)];
const complete = await build(refresh);
assert.equal(complete.status, 'LOCKED');
assert.equal(complete.immutable, true);
assert.equal(complete.tickets.five, partial.tickets.five);
assert.equal(complete.tickets.ten, partial.tickets.ten);
assert.equal(complete.tickets.fifty.targetMet, true);
assert.ok(complete.lockedAt);

pool = [];
assert.equal((await build()).status, 'BUILDING');
assert.equal((await build({...partial,revision:'obsolete'})).tickets.five, null);
assert.equal((await build({...partial,saturday:'2026-10-10'})).tickets.five, null);
assert.equal((await ctx.buildWeekendLockV70({},'2026-10-17','quality-revision',partial)).tickets.five, null);

pool = [leg(1,2.2),leg(2,2.2),leg(3,2)];
daily = {payload:{ticket:{legs:[{fixtureId:1}]}}};
assert.equal((await build()).tickets.ten, null, 'Elite fixtures stay reserved');
daily = null;
const fallback = ctx.ticketOptimizeV70([leg(1,1.5),leg(2,1.5)],3.125,3,3.25,1,9,true);
assert.equal(fallback.targetMet,false);
const target = ctx.ticketOptimizeV70([leg(1,1.5),leg(2,2.1)],3.125,3,3.25,1,9,true);
assert.equal(target.targetMet,true);
assert.ok(target.combined >= 3 && target.combined <= 3.25);

// Exercise the refresh caller so PARTIAL snapshots keep building with their locks.
ctx.easternHour = () => 6;
ctx.easternWeekday = () => 'Sat';
ctx.activeDailyTicketDateV93 = () => '2026-10-17';
ctx.weekendAnchorV70 = () => '2026-10-17';
ctx.getFeedSnapshot = async (_env,key) => ({payload:key.includes(':daily:') ? {status:'LOCKED',revision:ctx.TICKET_LOCK_REVISION_V78} : partial});
const locks = await ctx.ensureTicketLocksV70({});
assert.equal(locks.weekend.tickets.five,partial.tickets.five);
assert.equal(locks.weekend.tickets.ten,partial.tickets.ten);
console.log('Weekend lock regression tests passed: independent publication, immutability, completion, revision isolation, reservation, strict targets, refresh caller.');
