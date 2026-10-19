async function runModelValidationV1(env) {
  const now=Date.now(),asOf=new Date(now).toISOString(),key='model-validation-v1:status';
  const previous=(await getFeedSnapshot(env,key).catch(()=>null))?.payload;
  if(now-Date.parse(previous?.asOf)<6*3600000)return {skipped:true,reason:'VALIDATION_6H_CADENCE'};
  const rows=[];let truncated=false;
  for(let offset=0;offset<5000;offset+=500) {
    const page=arr2(await sb(env,'two45_goal_forecasts_v3?generated_at=gte.2026-10-18T00:00:00Z&generated_at=lte.'+encodeURIComponent(asOf)+'&select=id,fixture_id,generated_at,kickoff_at,primary:payload->primary,candidates:payload->candidates,legacy:payload->legacy,protocol:payload->>validationProtocol&order=generated_at.asc,id.asc&limit=500&offset='+offset,{timeoutMs:4000}));
    rows.push(...page);if(page.length<500)break;if(offset===4500)truncated=true;
  }
  const frozen=new Map();
  for(const r of rows)if(r.protocol===MIGRATION_PROTOCOL_V2&&Date.parse(r.generated_at)<=Date.parse(r.kickoff_at)-3600000){const old=frozen.get(String(r.fixture_id));if(!old||Date.parse(old.generated_at)<Date.parse(r.generated_at))frozen.set(String(r.fixture_id),r);}
  const ids=[...frozen.keys()].filter(x=>/^\d+$/.test(x)),results=[],conflicts=[];
  for(let i=0;i<ids.length;i+=100) {
    const group=ids.slice(i,i+100).join(',');
    const [r,c]=await Promise.all([
      sb(env,'two45_goal_results_v3?fixture_id=in.('+group+')&result_available_at=lte.'+encodeURIComponent(asOf)+'&select=fixture_id,home_goals,away_goals',{timeoutMs:4000}),
      sb(env,'two45_goal_result_conflicts_v3?fixture_id=in.('+group+')&observed_at=lte.'+encodeURIComponent(asOf)+'&select=fixture_id',{timeoutMs:4000})]);
    results.push(...arr2(r));conflicts.push(...arr2(c));
  }
  const labels=new Map(results.map(r=>[String(r.fixture_id),r])),ambiguous=new Set(conflicts.map(r=>String(r.fixture_id)));
  const input=[...frozen.values()].map(r=>{const label=ambiguous.has(String(r.fixture_id))?null:labels.get(String(r.fixture_id));return {...r,final_home_score:label?.home_goals,final_away_score:label?.away_goals,payload:{validationProtocol:r.protocol,primary:r.primary,candidates:r.candidates,legacy:r.legacy,legacyResearchDecision:r.legacy?.decision}};});
  const report=shadowEvaluationV1.evaluate(input,{protocol:MIGRATION_PROTOCOL_V2});
  if(truncated)report.promotion.reasons.push('BOUNDED_EXPORT_TRUNCATED_FULL_REPLAY_REQUIRED');
  report.promotion.reasons.push('HISTORICAL_PAIRED_BRIER_AND_LOG_LOSS_FAILED','PUBLIC_RECORD_RESULT_SOURCE_REQUIRES_CUTOVER');
  const status={version:'two45-validation-routine-v1',asOf,ok:true,mode:'RESEARCH_ONLY',promotionAllowed:false,inputRows:rows.length,truncated,
    frozenFixtures:frozen.size,pendingLabels:input.filter(r=>r.final_home_score==null).length,excludedConflicts:ambiguous.size,report};
  await archivePlayerResearchV1(env,'model-validation-v1:report:'+asOf,status);
  await saveFeedSnapshot(env,key,status,365*86400);return status;
}
