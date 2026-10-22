export const PREFERRED_BOOKMAKERS = ["Bet365","Pinnacle","1xBet","Marathonbet","William Hill"];
export function normalizeBookmaker(name) {
  return String(name||"").toLowerCase().replace(/[^a-z0-9]/g,"");
}
export function extractQuotes(oddsSnapshot) {
  const rows = Array.isArray(oddsSnapshot?.response) ? oddsSnapshot.response : [];
  const out = [];
  for (const fixture of rows) {
    const fixtureId = fixture.fixture?.id;
    if (fixtureId == null) continue;
    for (const book of fixture.bookmakers||[]) {
      const bookmaker = PREFERRED_BOOKMAKERS.find(b=>normalizeBookmaker(b)===normalizeBookmaker(book.name));
      if (!bookmaker) continue;
      for (const bet of book.bets||[]) {
        for (const selection of bet.values||[]) {
          const odds=Number(selection.odd);
          if (!(odds>1) || !Number.isFinite(odds)) continue;
          out.push({fixtureId,marketId:String(bet.id??bet.name),marketName:bet.name,selection:selection.value,bookmaker,odds,providerUpdatedAt:book.providerUpdatedAt??fixture.update??null});
        }
      }
    }
  }
  return out;
}
export function chooseQuotes(quotes) {
  const priority=new Map(PREFERRED_BOOKMAKERS.map((b,i)=>[b,i]));
  return [...quotes].sort((a,b)=>(priority.get(a.bookmaker)??99)-(priority.get(b.bookmaker)??99));
}
