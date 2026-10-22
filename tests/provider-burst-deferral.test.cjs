const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const s = fs.readFileSync(require('node:path').join(__dirname, '..', 'worker.js'), 'utf8');
const end = s.indexOf('__name(processOne, "processOne")');
const start = s.lastIndexOf('  } catch (e) {', end);
const body = s.slice(start + '  } catch (e) {'.length, end).trim().replace(/\}\s*\}$/, '');
async function handle(message, attempts = 4) {
  let patch;
  const ctx = { num4: (n, fallback = 0) => Number(n) || fallback,
    patchJob: async (_env, _id, value) => { patch = value; } };
  vm.createContext(ctx);
  vm.runInContext('async function handle(job,e){const env={};'+body+'}', ctx);
  const result = await ctx.handle({id: 'job', fixture_id: 1636430, attempts, started_at: '2026-10-22T10:00:00Z'}, new Error(message));
  return {patch, result};
}
test('local burst exhaustion defers without consuming failure retries or entering two-hour FAILED cooldown', async () => {
  const {patch, result} = await handle('Two45 bounded provider burst complete; continue next cron');
  assert.equal(patch.status, 'PENDING'); assert.equal(patch.attempts, 0); assert.equal(patch.started_at, null);
  assert.equal(result.status, 'DEFERRED'); assert.equal(result.rateLimited, true);
});
test('genuine input failures retain failure handling', async () => {
  const {patch, result} = await handle('Invalid team identity');
  assert.equal(patch.status, 'FAILED'); assert.equal(patch.attempts, 4);
  assert.equal(result.rateLimited, false);
});
test('upstream 429 continues to defer safely', async () => {
  assert.equal((await handle('HTTP 429')).patch.status, 'PENDING');
});
