const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const source = html.slice(html.indexOf('function groupGames('), html.indexOf('\nfunction findForecast('));
function render(board, query = '') {
  const ctx = { Map, Date, Number, String, state: { query }, LIVE: new Set(['1H']), FIN: new Set(['FT']),
    status: f => f.fixture.status.short, passes: () => true,
    matches: f => !query || f.teams.home.name.includes(query),
    fmap: b => new Map((b.independentForecasts || []).map(x => [String(x.fixtureId), x])),
    displayCompetitionTier: (name, id) => [3, 848].includes(id) ? 2 : 3,
    esc: String, time: f => f.fixture.date,
    gameRow: (f, m) => `<article data-id="${f.fixture.id}" data-analysis="${m.has(String(f.fixture.id))}"></article>` };
  vm.createContext(ctx); vm.runInContext(source, ctx);
  return ctx.groupGames(board);
}
function fixture(id, league, name = 'Home') {
  return { fixture: { id, date: '2026-10-22T19:00:00Z', status: { short: 'NS' } },
    league: { id: league, name: league === 3 ? 'UEFA Europa League' : league === 848 ? 'UEFA Europa Conference League' : 'Other '+league, country: 'World' },
    teams: { home: { name }, away: { name: 'Away' } } };
}
test('all 18 matches remain together for each UEFA competition despite partial analysis', () => {
  const games = [3, 848].flatMap((league, i) => Array.from({length: 18}, (_, j) => fixture(i * 100 + j + 1, league)));
  const result = render({ games, independentForecasts: [{ fixtureId: 1 }, { fixtureId: 101 }], strongPicks: [] });
  assert.equal((result.match(/class="comp"/g) || []).length, 2);
  assert.equal((result.match(/18 games/g) || []).length, 2);
  assert.equal((result.match(/<article/g) || []).length, 36);
  assert.equal((result.match(/data-analysis="true"/g) || []).length, 2);
  assert.doesNotMatch(result, /rows closed/);
});
test('Tier 2 fixtures remain expanded beyond the first four competitions', () => {
  const games = Array.from({length: 6}, (_, i) => fixture(i + 1, 100 + i)).concat(fixture(99, 848));
  const result = render({ games, independentForecasts: games.slice(0, 6).map(f => ({ fixtureId: f.fixture.id })) });
  const group = result.split('<div class="comp">').find(x => x.includes('UEFA Europa Conference League'));
  assert.doesNotMatch(group, /rows closed/);
});
test('search reveals matching fixtures even in otherwise collapsed competitions', () => {
  const games = Array.from({length: 7}, (_, i) => fixture(i + 1, 100 + i, 'Needle'));
  assert.doesNotMatch(render({ games }, 'Needle'), /rows closed/);
});
test('empty results and fixtures fallback remain supported', () => {
  assert.match(render({games: []}), /No matches found/);
  assert.match(render({fixtures: [fixture(1, 3)]}), /data-id="1"/);
});
