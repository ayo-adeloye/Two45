// The configuration is frozen from development scoring. Daily refreshes never retune on test results.
const GOAL_CORE_CONFIG_V3 = {teamPenalty:12,halfLifeDays:90,rho:0,seasonWeight:1};

async function refreshGoalCoreV3(env) {
  const now=new Date(),asOf=now.toISOString(),date=asOf.slice(0,10),statusKey='forecast-core-v3:training-status';
  const status=(await getFeedSnapshot(env,statusKey).catch(()=>null))?.payload;
  if(status?.date===date&&status?.state==='READY')return {skipped:true,...status};
  if(status?.state==='RUNNING'&&Date.now()-Date.parse(status.startedAt)<15*60000)return {skipped:true,reason:'TRAINING_IN_PROGRESS'};
  if(Date.parse(status?.retryAfter)>Date.now())return {skipped:true,reason:'TRAINING_RETRY_BACKOFF'};
  try {
    const existing=arr2(await sb(env,'two45_goal_model_artifacts_v3?model_version=eq.'+encodeURIComponent(forecastCoreV3.CORE_VERSION)+'&select=id,trained_before&order=trained_before.desc&limit=1'))[0];
    if(existing?.trained_before?.slice(0,10)===date) {
      const result={state:'READY',date,modelId:existing.id,trainedBefore:existing.trained_before,mode:'SHADOW'};
      await saveFeedSnapshot(env,statusKey,result,365*86400);return result;
    }
    await saveFeedSnapshot(env,statusKey,{state:'RUNNING',date,startedAt:asOf,mode:'SHADOW'},365*86400);
    const data=await sb(env,'rpc/two45_goal_training_data_v3',{method:'POST',body:JSON.stringify({p_as_of:asOf}),timeoutMs:15000});
    if(!data||data.truncated)throw Error('Training corpus unavailable or exceeded declared bounds');
    const inputs=forecastCoreV3.attachSeasonHistory(data.fixtures,data.features);
    const parameters=forecastCoreV3.fitGoalModel(inputs,asOf,GOAL_CORE_CONFIG_V3);
    if(parameters.trainingFixtures<100||parameters.fit.lastStep>.001)throw Error('Insufficient training data or optimizer did not converge');
    parameters.calibration=await sb(env,'rpc/two45_goal_calibration_v3',{method:'POST',body:JSON.stringify({p_as_of:asOf})});
    const hash=await sb(env,'rpc/two45_goal_dataset_hash_v3',{method:'POST',body:JSON.stringify({p_as_of:asOf}),timeoutMs:15000});
    if(!/^[a-f0-9]{64}$/.test(String(hash)))throw Error('Training dataset hash unavailable');
    const saved=arr2(await sb(env,'two45_goal_model_artifacts_v3?on_conflict=artifact_key',{method:'POST',prefer:'resolution=ignore-duplicates,return=representation',timeoutMs:15000,
      body:JSON.stringify({artifact_key:forecastCoreV3.CORE_VERSION+':'+date,model_version:forecastCoreV3.CORE_VERSION,trained_before:asOf,dataset_hash:hash,parameters,
      validation:{promotionAllowed:false,phase:'PROSPECTIVE_SHADOW',historicalGate:'FAILED_PAIRED_BRIER_AND_LOG_LOSS',configuration:'development-frozen; no automatic retuning'}})}))[0];
    const result={state:'READY',date,modelId:saved?.id||null,trainedBefore:asOf,trainingFixtures:parameters.trainingFixtures,mode:'SHADOW',datasetHash:hash};
    await saveFeedSnapshot(env,statusKey,result,365*86400);return result;
  }catch(e) {
    const result={state:'FAILED',date,error:safeRefreshError(e),retryAfter:new Date(Date.now()+3600000).toISOString(),mode:'SHADOW'};
    await saveFeedSnapshot(env,statusKey,result,365*86400).catch(()=>null);return result;
  }
}

async function recordGoalForecastV3(env,job,legacyAnalysis,quotes,legacyDecision=null) {
  const now=Date.now(),asOf=new Date(now).toISOString();
  if(!(now<Date.parse(job.kickoff_at))||legacyAnalysis.live)return {mode:'SHADOW',skipped:true,reason:'NOT_PREMATCH'};
  const contextRow=await sb(env,'rpc/two45_goal_context_v3',{method:'POST',timeoutMs:4000,body:JSON.stringify({p_league:String(job.provider_league_id),p_season:String(job.season),p_home:String(job.home_team_id),p_away:String(job.away_team_id),p_as_of:asOf,p_kickoff:job.kickoff_at})});
  if(!contextRow?.model)return {mode:'SHADOW',skipped:true,reason:'MODEL_ARTIFACT_UNAVAILABLE'};
  const fixture={fixture_id:job.fixture_id,league_id:String(job.provider_league_id),season:String(job.season),home_id:String(job.home_team_id),away_id:String(job.away_team_id),kickoff_at:job.kickoff_at};
  fixture.home_features=forecastCoreV3.seasonFeatures(contextRow.home_feature,fixture,'home',asOf);
  fixture.away_features=forecastCoreV3.seasonFeatures(contextRow.away_feature,fixture,'away',asOf);
  const prediction=forecastCoreV3.predictGoals(contextRow.model,fixture,asOf);
  const {scoreCells,...forecast}=prediction; // Reconstruct cells from immutable artifact + fixture inputs.
  const featureTimes=[fixture.home_features?.observedAt,fixture.away_features?.observedAt].filter(Boolean).map(Date.parse);
  const context={fixtureId:job.fixture_id,modelVersion:forecastCoreV3.CORE_VERSION,now,kickoff:job.kickoff_at,tier:competitionTierV21(job.competition,job.provider_league_id),
    sampleSize:Math.min(Math.max(prediction.evidence.homeEffectiveMatches,prediction.evidence.homeSeasonMatches),Math.max(prediction.evidence.awayEffectiveMatches,prediction.evidence.awaySeasonMatches)),
    featureAsOf:featureTimes.length?new Date(Math.min(...featureTimes)).toISOString():contextRow.model.trainedBefore};
  const candidates=selectionV2.generateCandidates(forecast,quotes,contextRow.model.calibration,context);
  await sb(env,'two45_goal_forecasts_v3',{method:'POST',prefer:'return=minimal',timeoutMs:4000,body:JSON.stringify({fixture_id:job.fixture_id,model_id:contextRow.model_id,generated_at:asOf,kickoff_at:job.kickoff_at,
    payload:{mode:'SHADOW',promotionAllowed:false,fixture,forecast,context,quotes,candidates,primary:selectionV2.primaryPicks(candidates),legacy:{modelVersion:legacyAnalysis.modelVersion,expectedGoals:legacyAnalysis.expectedGoals,probabilities:legacyAnalysis.probabilities,decision:legacyDecision}}})});
  return {mode:'SHADOW',modelId:contextRow.model_id,version:forecastCoreV3.CORE_VERSION,expectedGoals:forecast.expectedGoals,rejectionReasons:forecast.rejectionReasons,promotionAllowed:false};
}
