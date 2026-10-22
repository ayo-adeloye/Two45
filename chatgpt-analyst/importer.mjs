import {validateDraft} from "./validator.mjs";
import {extractQuotes} from "./bookmakers.mjs";
export function importDraft({draft, board, odds, now=Date.now()}) {
  const fixtures=Array.isArray(board?.fixtures)?board.fixtures:[];
  const quotes=extractQuotes(odds);
  const validation=validateDraft(draft,fixtures,quotes,now);
  return {schema:"two45-analyst-import-v1",status:validation.ok?"READY_FOR_ADMIN_REVIEW":"REJECTED",validation,source:{fixtures:fixtures.length,quotes:quotes.length},published:false};
}
