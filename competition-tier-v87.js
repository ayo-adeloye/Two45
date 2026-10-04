const TIER1_IDS = new Set([1,2,4,5,9,15,39,61,78,135,140]);
const TIER2_IDS = new Set([3,13,40,45,48,66,71,72,73,81,88,94,136,137,141,143,144,253]);
const TIER3_IDS = new Set([179,203,262]);

const norm = value => String(value || "")
  .toLowerCase()
  .normalize("NFKD")
  .replace(/[’']/g,"")
  .replace(/[^a-z0-9]+/g," ")
  .trim();

export function competitionTierV87(value, leagueId) {
  const n = norm(value);
  const id = Number(leagueId);

  if (!n && !Number.isFinite(id)) return 4;

  // Explicit quality downgrades must run before any broad family or ID rule.
  if (/\bfriendl/.test(n)) return 3;
  if (/\bliga premier serie a\b/.test(n)) return 4;
  if (/\b2 frauen bundesliga\b/.test(n)) return 3;
  if (/\b(u17|u18|u19)\b/.test(n)) return 3;

  // Approved development competitions: useful for testing, but never Tier 1.
  if (/\b(u20|u21|u23)\b/.test(n) &&
      /\b(uefa|caf|afc|concacaf|world|championship|cup of nations|qualif)/.test(n)) return 2;

  // Known second divisions / strong secondary competitions.
  if (/\bserie b\b/.test(n) ||
      /\b2 bundesliga\b/.test(n) ||
      /\bchampionship\b/.test(n) ||
      /\bsegunda division\b/.test(n) ||
      /\busl championship\b/.test(n) ||
      /\bnpfl\b/.test(n) ||
      /\bprimera a\b/.test(n) ||
      /\bj league cup\b/.test(n)) return 2;

  // Major women's top flights remain analysable, but do not inherit men's Tier 1.
  if (/\b(frauen bundesliga|serie a women|eredivisie women|womens super league|liga f)\b/.test(n)) return 2;

  // Tier 1: exact top competitions. Generic "Premier League" is ID-gated to
  // avoid promoting unrelated competitions such as Mongolia Premier League.
  if (/\buefa champions league\b/.test(n) ||
      n === "la liga" ||
      n === "serie a" ||
      n === "bundesliga" ||
      n === "ligue 1" ||
      /\buefa nations league\b/.test(n) ||
      /\bnations league\b/.test(n) ||
      n === "copa america" ||
      /\bafrica cup of nations\b/.test(n) ||
      n === "afcon") return 1;

  if (/\bworld cup qualif/.test(n) ||
      /\bworld cup qualifiers/.test(n) ||
      /\beuro qualif/.test(n) ||
      /\beuropean championship qualif/.test(n)) return 2;
  if (n === "world cup") return 1;

  // Tier 2 continental / high-quality leagues.
  if (/\beuropa league\b/.test(n) ||
      /\bconference league\b/.test(n) ||
      /\bcopa libertadores\b/.test(n) ||
      /\blibertadores\b/.test(n) ||
      /\bcopa sudamericana\b/.test(n) ||
      /\bsudamericana\b/.test(n) ||
      n === "eredivisie" ||
      n === "primeira liga" ||
      /\bbrasileir/.test(n) ||
      /\bliga profesional argentina\b/.test(n) ||
      n === "mls" ||
      /\basian cup\b/.test(n) ||
      /\bafc\b/.test(n) ||
      /\bcaf\b/.test(n) ||
      /\bconcacaf\b/.test(n)) return 2;

  if (/\bscottish premiership\b/.test(n) ||
      /\bbelgian pro league\b/.test(n) ||
      /\bswiss super league\b/.test(n) ||
      /\baustrian bundesliga\b/.test(n) ||
      /\bsuper lig\b/.test(n) ||
      /\bliga mx\b/.test(n) ||
      /\bsaudi pro league\b/.test(n) ||
      /\binternational\b/.test(n)) return 3;

  if (TIER1_IDS.has(id)) return 1;
  if (TIER2_IDS.has(id)) return 2;
  if (TIER3_IDS.has(id)) return 3;
  return 4;
}
