-- Calibration v2: citizen-selected severity and urgency are authoritative
-- structured inputs. AI can enrich contextual factors but cannot dilute them.

update public.priority_scoring_settings
set version = 'hybrid-priority-v2-manual-signals', updated_at = now()
where id = true;

create or replace function public.manual_severity_factor(value smallint)
returns smallint language sql immutable as $$
  select case value when 1 then 25 when 2 then 50 when 3 then 75 when 4 then 100 else 25 end::smallint;
$$;

create or replace function public.manual_urgency_factor(value smallint)
returns smallint language sql immutable as $$
  select case value when 1 then 25 when 2 then 50 when 3 then 75 when 4 then 100 else 25 end::smallint;
$$;

create or replace function public.fallback_priority_factors(c public.challenges)
returns jsonb language sql stable set search_path = public as $$
  select jsonb_build_object(
    'severity', public.manual_severity_factor(c.severity),
    'urgency', public.manual_urgency_factor(c.urgency),
    'population_impact', least(100, greatest(0, coalesce(c.affected_population, 0) / 10)),
    'health_safety_risk', case when c.domain in ('Water','Healthcare','Sanitation') then 60 else 25 end,
    'essential_service_impact', case when c.domain in ('Water','Healthcare','Education','Public Services') then 70 else 30 end,
    'vulnerable_population', least(100, cardinality(c.vulnerable_groups) * 25),
    'persistence', least(100, greatest(10, extract(day from now() - c.created_at)::integer * 2)),
    'emergency_signal', false,
    'critical_hazard', 'none'
  );
$$;

create or replace function public.apply_ai_priority_analysis(challenge_uuid uuid, source_hash text, ai_analysis jsonb, analysis_model text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare c public.challenges; raw jsonb; f jsonb; fallback jsonb; score smallint; confidence smallint; trusted boolean; critical boolean := false; override_reason text := null; status text; review text; version text; manual_reasons jsonb;
begin
  if auth.role() <> 'service_role' then raise exception 'Only the priority analysis service may apply AI analysis'; end if;
  select * into c from public.challenges where id = challenge_uuid for update;
  if not found then raise exception 'Challenge not found'; end if;
  if c.priority_manual_override then return jsonb_build_object('applied', false, 'reason', 'manual_override'); end if;
  if source_hash <> public.priority_source_hash(c) then return jsonb_build_object('applied', false, 'reason', 'stale_source'); end if;
  if c.priority_source_hash = source_hash and c.priority_analysis_status in ('AI_COMPLETE','AI_REVIEW_RECOMMENDED','HUMAN_REVIEW_REQUIRED') then return jsonb_build_object('applied', false, 'reason', 'unchanged_source'); end if;
  raw := ai_analysis;
  confidence := least(100, greatest(0, coalesce((raw->>'confidence')::integer, 0)))::smallint;
  fallback := public.fallback_priority_factors(c);
  -- Never read severity or urgency from AI. These are already normalized once,
  -- directly from the citizen's 1..4 dropdown selection, with no second scaling.
  f := jsonb_build_object(
    'severity', public.manual_severity_factor(c.severity),
    'urgency', public.manual_urgency_factor(c.urgency),
    'population_impact', least(100,greatest(0,coalesce((raw->>'population_impact')::numeric,(fallback->>'population_impact')::numeric)))::integer,
    'health_safety_risk', least(100,greatest(0,coalesce((raw->>'health_safety_risk')::numeric,(fallback->>'health_safety_risk')::numeric)))::integer,
    'essential_service_impact', least(100,greatest(0,coalesce((raw->>'essential_service_impact')::numeric,(fallback->>'essential_service_impact')::numeric)))::integer,
    'vulnerable_population', least(100,greatest(0,coalesce((raw->>'vulnerable_population')::numeric,(fallback->>'vulnerable_population')::numeric)))::integer,
    'persistence', least(100,greatest(0,coalesce((raw->>'persistence')::numeric,(fallback->>'persistence')::numeric)))::integer,
    'emergency_signal', coalesce((raw->>'emergency_signal')::boolean,false),
    'critical_hazard', coalesce(raw->>'critical_hazard','none')
  );
  if confidence < 60 then f := fallback; status := 'HUMAN_REVIEW_REQUIRED'; review := 'HUMAN_REVIEW_REQUIRED';
  elsif confidence < 80 then status := 'AI_REVIEW_RECOMMENDED'; review := 'AI_REVIEW_RECOMMENDED';
  else status := 'AI_COMPLETE'; review := 'NOT_REVIEWED'; end if;
  trusted := confidence >= 80 or exists(select 1 from public.evidence e join public.reports r on r.id=e.report_id where r.challenge_id=c.id) or c.verification in ('community_verified','officially_verified');
  critical := trusted and (((f->>'emergency_signal')::boolean and (f->>'health_safety_risk')::integer >= 85) or ((f->>'critical_hazard') <> 'none' and confidence >= 80));
  score := public.priority_score_for(f);
  if critical and score < 90 then score := 90; override_reason := 'Safety override: trusted emergency or critical hazard signal requires a minimum score of 90.'; end if;
  select version into version from public.priority_scoring_settings where id = true;
  manual_reasons := jsonb_build_array(format('%s severity (%s/100) and %s urgency (%s/100) were reported by the citizen.', case c.severity when 1 then 'Minor' when 2 then 'Moderate' when 3 then 'High' else 'Critical' end, public.manual_severity_factor(c.severity), case c.urgency when 1 then 'Low' when 2 then 'Medium' when 3 then 'High' else 'Critical' end, public.manual_urgency_factor(c.urgency)));
  update public.challenges set priority_score=score, priority_level=case when critical then 'CRITICAL' else public.priority_level_for(score) end,
    priority_factors=f, priority_reasons=manual_reasons || coalesce(raw->'reasons','[]'::jsonb), priority_explanation=manual_reasons || coalesce(raw->'reasons','[]'::jsonb), priority_confidence=confidence,
    priority_analysis_status=status, priority_review_status=review, priority_analyzed_at=now(), priority_model=analysis_model, priority_version=version,
    priority_override=critical, priority_override_reason=override_reason, priority_source_hash=source_hash
  where id=c.id;
  insert into public.challenge_priority_analyses(challenge_id,source_hash,ai_analysis,validated_factors,confidence,analysis_status,model,scoring_version,override_applied,override_reason)
  values(c.id,source_hash,raw,f,confidence,status,analysis_model,version,critical,override_reason);
  insert into public.priority_score_events(challenge_id,previous_score,new_score,factors,confidence,scoring_version,reason,override_applied,override_reason)
  values(c.id,c.priority_score,score,f,confidence,version,'Validated AI contextual factors plus authoritative citizen severity and urgency',critical,override_reason);
  insert into public.audit_logs(action,entity_type,entity_id,metadata) values('priority_ai_applied','challenge',c.id,jsonb_build_object('previous_score',c.priority_score,'new_score',score,'confidence',confidence,'status',status,'override',critical,'manual_severity',f->'severity','manual_urgency',f->'urgency'));
  return jsonb_build_object('applied',true,'score',score,'level',case when critical then 'CRITICAL' else public.priority_level_for(score) end,'status',status);
end;
$$;

-- Recalculate existing non-manually-reviewed records using the corrected
-- categorical mapping. Existing manual reviews remain untouched.
select public.refresh_challenge_priority(id) from public.challenges where not priority_manual_override;
