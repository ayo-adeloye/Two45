export function repriceEngine2Candidate(candidate,quote,now=Date.now()) {
 const p=Number(candidate?.probability),odds=Number(quote?.odds),observed=Date.parse(quote?.observedAt),kickoff=Date.parse(candidate?.kickoffAt);
 if(quote?.bookmaker!=='Bet365'||!(p>0&&p<1)||!(odds>1)||!Number.isFinite(observed)||observed>now||now-observed>1800000||!(now<kickoff))return {ok:false,reason:'EXACT_FRESH_PREMATCH_BET365_QUOTE_REQUIRED',publicationEligible:false};
 const currentEV=p*odds-1;
 return {ok:true,odds,currentEV,changed:Math.abs(odds-Number(candidate.odds))>=0.005,modelRiskFlag:currentEV>0.30?'EXTREME_MODEL_EDGE_REQUIRES_CALIBRATION':null,publicationEligible:false};
}
