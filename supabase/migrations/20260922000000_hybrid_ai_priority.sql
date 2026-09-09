-- Hybrid AI-assisted priority scoring. AI supplies only validated factor inputs;
-- PostgreSQL remains the sole authority for scoring, overrides and persistence.

create table if not exists public.priority_scoring_settings (
  id boolean primary key default true check (id),
  severity_weight numeric(5,2) not null default 30 check (severity_weight >= 0),
  urgency_weight numeric(5,2) not null default 25 check (urgency_weight >= 0),
  population_weight numeric(5,2) not null default 15 check (population_weight >= 0),
  health_safety_weight numeric(5,2) not null default 10 check (health_safety_weight >= 0),
  essential_service_weight numeric(5,2) not null default 10 check (essential_service_weight >= 0),
  vulnerable_population_weight numeric(5,2) not null default 5 check (vulnerable_population_weight >= 0),
  persistence_weight numeric(5,2) not null default 5 check (persistence_weight >= 0),
  critical_threshold smallint not null default 90 check (critical_threshold between 0 and 100),
  high_threshold smallint not null default 75 check (high_threshold between 0 and 100),
  medium_threshold smallint not null default 50 check (medium_threshold between 0 and 100),
  low_threshold smallint not null default 25 check (low_threshold between 0 and 100),
  version text not null default 'hybrid-priority-v1',
  updated_at timestamptz not null default now(),
  check (severity_weight + urgency_weight + population_weight + health_safety_weight + essential_service_weight + vulnerable_population_weight + persistence_weight > 0),
  check (critical_threshold >= high_threshold and high_threshold >= medium_threshold and medium_threshold >= low_threshold)
);
insert into public.priority_scoring_settings (id) values (true) on conflict (id) do nothing;

alter table public.challenges
  add column if not exists priority_level text not null default 'MINOR' check (priority_level in ('CRITICAL','HIGH','MEDIUM','LOW','MINOR')),
  add column if not exists priority_factors jsonb not null default '{}'::jsonb,
  add column if not exists priority_explanation jsonb not null default '[]'::jsonb,
  add column if not exists priority_confidence smallint check (priority_confidence between 0 and 100),
  add column if not exists priority_analysis_status text not null default 'PENDING' check (priority_analysis_status in ('PENDING','AI_COMPLETE','AI_REVIEW_RECOMMENDED','HUMAN_REVIEW_REQUIRED','FALLBACK','MANUALLY_REVIEWED','FAILED')),
  add column if not exists priority_review_status text not null default 'NOT_REVIEWED' check (priority_review_status in ('NOT_REVIEWED','AI_REVIEW_RECOMMENDED','HUMAN_REVIEW_REQUIRED','MANUALLY_REVIEWED')),
  add column if not exists priority_analyzed_at timestamptz,
  add column if not exists priority_model text,
  add column if not exists priority_version text,
  add column if not exists priority_override boolean not null default false,
  add column if not exists priority_override_reason text,
  add column if not exists priority_source_hash text,
  add column if not exists priority_manual_override boolean not null default false;
create index if not exists challenges_priority_rank_idx on public.challenges(priority_score desc, priority_level, created_at asc) where merged_into_id is null;

create table if not exists public.challenge_priority_analyses (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.challenges(id) on delete cascade,
  source_hash text not null,
  ai_analysis jsonb,
  validated_factors jsonb not null default '{}'::jsonb,
  confidence smallint check (confidence between 0 and 100),
  analysis_status text not null,
  model text,
  scoring_version text not null,
  override_applied boolean not null default false,
  override_reason text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists challenge_priority_analyses_challenge_idx on public.challenge_priority_analyses(challenge_id, created_at desc);

create table if not exists public.priority_score_events (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.challenges(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  previous_score smallint,
  new_score smallint not null check (new_score between 0 and 100),
  factors jsonb not null,
  confidence smallint check (confidence between 0 and 100),
  scoring_version text not null,
  reason text not null,
  override_applied boolean not null default false,
  override_reason text,
  created_at timestamptz not null default now()
);
create index if not exists priority_score_events_challenge_idx on public.priority_score_events(challenge_id, created_at desc);

create or replace function public.priority_source_hash(c public.challenges)
returns text language sql immutable set search_path = public as $$
  select encode(extensions.digest(convert_to(concat_ws('|', c.title, c.summary, c.domain, c.district, coalesce(c.subdomain,''), coalesce(c.severity::text,''), coalesce(c.urgency::text,''), coalesce(c.affected_population::text,''), c.verification::text), 'UTF8'), 'sha256'), 'hex');
$$;

create or replace function public.priority_level_for(score smallint)
returns text language plpgsql stable security definer set search_path = public as $$
declare s public.priority_scoring_settings;
begin
  select * into s from public.priority_scoring_settings where id = true;
  if score >= s.critical_threshold then return 'CRITICAL'; end if;
  if score >= s.high_threshold then return 'HIGH'; end if;
  if score >= s.medium_threshold then return 'MEDIUM'; end if;
  if score >= s.low_threshold then return 'LOW'; end if;
  return 'MINOR';
end;
$$;

create or replace function public.fallback_priority_factors(c public.challenges)
returns jsonb language sql stable set search_path = public as $$
  select jsonb_build_object(
    'severity', least(100, greatest(0, coalesce(c.severity, 1) * 25)),
    'urgency', least(100, greatest(0, coalesce(c.urgency, 1) * 25)),
    'population_impact', least(100, greatest(0, coalesce(c.affected_population, 0) / 10)),
    'health_safety_risk', case when c.domain in ('Water','Healthcare','Sanitation') then 60 else 25 end,
    'essential_service_impact', case when c.domain in ('Water','Healthcare','Education','Public Services') then 70 else 30 end,
    'vulnerable_population', least(100, cardinality(c.vulnerable_groups) * 25),
    'persistence', least(100, greatest(10, extract(day from now() - c.created_at)::integer * 2)),
    'emergency_signal', false,
    'critical_hazard', 'none'
  );
$$;

create or replace function public.priority_score_for(factors jsonb)
returns smallint language plpgsql stable security definer set search_path = public as $$
declare s public.priority_scoring_settings; total numeric;
begin
  select * into s from public.priority_scoring_settings where id = true;
  total := coalesce((factors->>'severity')::numeric,0) * s.severity_weight / 100
    + coalesce((factors->>'urgency')::numeric,0) * s.urgency_weight / 100
    + coalesce((factors->>'population_impact')::numeric,0) * s.population_weight / 100
    + coalesce((factors->>'health_safety_risk')::numeric,0) * s.health_safety_weight / 100
    + coalesce((factors->>'essential_service_impact')::numeric,0) * s.essential_service_weight / 100
    + coalesce((factors->>'vulnerable_population')::numeric,0) * s.vulnerable_population_weight / 100
    + coalesce((factors->>'persistence')::numeric,0) * s.persistence_weight / 100;
  return least(100, greatest(0, round(total)::integer))::smallint;
end;
$$;

-- Used by report/repost triggers when AI is unavailable or pending. It never overwrites a human review.
create or replace function public.refresh_challenge_priority(challenge_uuid uuid) returns void language plpgsql security definer set search_path = public as $$
declare c public.challenges; f jsonb; score smallint;
begin
  select * into c from public.challenges where id = challenge_uuid for update;
  if not found or c.priority_manual_override then return; end if;
  f := public.fallback_priority_factors(c);
  score := public.priority_score_for(f);
  update public.challenges set priority_score = score, priority_level = public.priority_level_for(score), priority_factors = f,
    priority_reasons = jsonb_build_array(jsonb_build_object('factor','fallback','value','Structured citizen report fields used while AI analysis is pending')),
    priority_explanation = jsonb_build_array('Priority is based on reported severity, urgency, population and service category.'),
    priority_analysis_status = 'FALLBACK', priority_review_status = 'NOT_REVIEWED', priority_version = (select version from public.priority_scoring_settings where id = true)
  where id = challenge_uuid;
end;
$$;

-- This RPC is callable only with the service-role JWT held by the Edge Function.
-- It normalizes every factor and calculates the score itself; AI never writes a score.
create or replace function public.apply_ai_priority_analysis(challenge_uuid uuid, source_hash text, ai_analysis jsonb, analysis_model text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare c public.challenges; raw jsonb; f jsonb; fallback jsonb; score smallint; confidence smallint; trusted boolean; critical boolean := false; override_reason text := null; status text; review text; version text;
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
  f := jsonb_build_object(
    'severity', least(100,greatest(0,coalesce((raw->>'severity')::numeric,(fallback->>'severity')::numeric)))::integer,
    'urgency', least(100,greatest(0,coalesce((raw->>'urgency')::numeric,(fallback->>'urgency')::numeric)))::integer,
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
  update public.challenges set priority_score=score, priority_level=case when critical then 'CRITICAL' else public.priority_level_for(score) end,
    priority_factors=f, priority_reasons=coalesce(raw->'reasons','[]'::jsonb), priority_explanation=coalesce(raw->'reasons','[]'::jsonb), priority_confidence=confidence,
    priority_analysis_status=status, priority_review_status=review, priority_analyzed_at=now(), priority_model=analysis_model, priority_version=version,
    priority_override=critical, priority_override_reason=override_reason, priority_source_hash=source_hash
  where id=c.id;
  insert into public.challenge_priority_analyses(challenge_id,source_hash,ai_analysis,validated_factors,confidence,analysis_status,model,scoring_version,override_applied,override_reason)
  values(c.id,source_hash,raw,f,confidence,status,analysis_model,version,critical,override_reason);
  insert into public.priority_score_events(challenge_id,previous_score,new_score,factors,confidence,scoring_version,reason,override_applied,override_reason)
  values(c.id,c.priority_score,score,f,confidence,version,'Validated AI factor analysis',critical,override_reason);
  insert into public.audit_logs(action,entity_type,entity_id,metadata) values('priority_ai_applied','challenge',c.id,jsonb_build_object('previous_score',c.priority_score,'new_score',score,'confidence',confidence,'status',status,'override',critical));
  return jsonb_build_object('applied',true,'score',score,'level',case when critical then 'CRITICAL' else public.priority_level_for(score) end,'status',status);
end;
$$;

create or replace function public.apply_priority_fallback(challenge_uuid uuid, reason text default 'AI analysis unavailable')
returns void language plpgsql security definer set search_path = public as $$
declare c public.challenges; f jsonb; score smallint; version text;
begin
  if auth.role() <> 'service_role' then raise exception 'Only the priority analysis service may apply fallback'; end if;
  select * into c from public.challenges where id=challenge_uuid for update;
  if not found or c.priority_manual_override then return; end if;
  f := public.fallback_priority_factors(c); score := public.priority_score_for(f); select version into version from public.priority_scoring_settings where id=true;
  update public.challenges set priority_score=score,priority_level=public.priority_level_for(score),priority_factors=f,priority_analysis_status='FALLBACK',priority_review_status='HUMAN_REVIEW_REQUIRED',priority_analyzed_at=now(),priority_version=version,priority_override=false,priority_override_reason=null where id=c.id;
  insert into public.priority_score_events(challenge_id,previous_score,new_score,factors,scoring_version,reason) values(c.id,c.priority_score,score,f,version,reason);
  insert into public.audit_logs(action,entity_type,entity_id,metadata) values('priority_fallback_applied','challenge',c.id,jsonb_build_object('reason',reason,'previous_score',c.priority_score,'new_score',score));
end;
$$;

create or replace function public.review_priority_analysis(challenge_uuid uuid, corrected_factors jsonb, review_reason text)
returns void language plpgsql security definer set search_path = public as $$
declare c public.challenges; f jsonb; score smallint; version text;
begin
  if auth.uid() is null or (select role from public.profiles where id=auth.uid()) not in ('admin','government','university_admin') then raise exception 'Not authorised to review priority'; end if;
  if review_reason is null or length(btrim(review_reason)) < 5 then raise exception 'A review reason is required'; end if;
  select * into c from public.challenges where id=challenge_uuid for update;
  if not found then raise exception 'Challenge not found'; end if;
  f := coalesce(c.priority_factors,'{}'::jsonb) || corrected_factors;
  -- Reject malformed or out-of-range human edits rather than silently clamping them.
  if exists(select 1 from jsonb_each_text(f) x where x.key in ('severity','urgency','population_impact','health_safety_risk','essential_service_impact','vulnerable_population','persistence') and (x.value !~ '^\\d+$' or x.value::integer not between 0 and 100)) then raise exception 'Factors must be whole numbers from 0 to 100'; end if;
  score := public.priority_score_for(f); select version into version from public.priority_scoring_settings where id=true;
  update public.challenges set priority_score=score,priority_level=public.priority_level_for(score),priority_factors=f,priority_analysis_status='MANUALLY_REVIEWED',priority_review_status='MANUALLY_REVIEWED',priority_manual_override=true,priority_analyzed_at=now(),priority_version=version,priority_override=false,priority_override_reason=null where id=c.id;
  insert into public.priority_score_events(challenge_id,actor_id,previous_score,new_score,factors,confidence,scoring_version,reason) values(c.id,auth.uid(),c.priority_score,score,f,c.priority_confidence,version,review_reason);
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,metadata) values(auth.uid(),'priority_manually_reviewed','challenge',c.id,jsonb_build_object('previous_score',c.priority_score,'new_score',score,'reason',review_reason,'factors',f));
end;
$$;

create or replace function public.on_challenge_priority_input_changed() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not new.priority_manual_override then perform public.refresh_challenge_priority(new.id); end if;
  return new;
end;
$$;
drop trigger if exists challenge_priority_input_changed on public.challenges;
create trigger challenge_priority_input_changed after update of title, summary, domain, district, severity, urgency, affected_population, vulnerable_groups, verification on public.challenges
for each row execute procedure public.on_challenge_priority_input_changed();

alter table public.priority_scoring_settings enable row level security;
alter table public.challenge_priority_analyses enable row level security;
alter table public.priority_score_events enable row level security;
create policy "admins manage priority settings" on public.priority_scoring_settings for all to authenticated using ((select role from public.profiles where id=auth.uid())='admin') with check ((select role from public.profiles where id=auth.uid())='admin');
create policy "staff reads priority analyses" on public.challenge_priority_analyses for select to authenticated using ((select role from public.profiles where id=auth.uid()) in ('admin','government','university_admin'));
create policy "staff reads priority events" on public.priority_score_events for select to authenticated using ((select role from public.profiles where id=auth.uid()) in ('admin','government','university_admin'));
revoke all on function public.apply_ai_priority_analysis(uuid,text,jsonb,text) from public, anon, authenticated;
revoke all on function public.apply_priority_fallback(uuid,text) from public, anon, authenticated;
grant execute on function public.review_priority_analysis(uuid,jsonb,text) to authenticated;

-- The public explorer exposes the final rank and level, never AI raw output or private report text.
drop function if exists public.search_challenges(text, text, text);
create function public.search_challenges(search_text text default '', district_filter text default null, domain_filter text default null)
returns table (id uuid, public_id text, title text, domain text, district text, priority_score smallint, priority_level text, verification public.verification_status, stage public.project_stage, affected_population integer, reports bigint, reposts bigint, created_at timestamptz, preview_image_path text, media jsonb, comments jsonb, public_latitude numeric, public_longitude numeric, assignment_status text, participant_count integer)
language sql stable security definer set search_path = public as $$
  select c.id,c.public_id,c.title,c.domain,c.district,c.priority_score,c.priority_level,c.verification,c.stage,c.affected_population,
    coalesce((select count(*) from public.reports r where r.challenge_id=c.id),0),coalesce((select count(*) from public.challenge_supports s where s.challenge_id=c.id),0),c.created_at,c.preview_image_path,
    coalesce((select jsonb_agg(jsonb_build_object('path',cm.storage_path,'type',cm.mime_type) order by cm.created_at) from public.challenge_media cm where cm.challenge_id=c.id),'[]'::jsonb),
    coalesce((select jsonb_agg(jsonb_build_object('id',s.id,'note',s.note,'created_at',s.created_at) order by s.created_at desc) from public.challenge_supports s where s.challenge_id=c.id and s.note is not null and btrim(s.note)<>''),'[]'::jsonb),
    c.public_latitude,c.public_longitude,latest.status::text,coalesce(latest.participant_count,0)::integer
  from public.challenges c left join lateral (select a.status,(select count(*) from public.problem_tasks t where t.assignment_id=a.id) participant_count from public.problem_assignments a where a.challenge_id=c.id order by a.created_at desc limit 1) latest on true
  where c.merged_into_id is null and (search_text='' or c.title ilike '%'||search_text||'%' or c.domain ilike '%'||search_text||'%') and (district_filter is null or c.district=district_filter) and (domain_filter is null or c.domain=domain_filter)
  order by c.priority_score desc, case when c.priority_level='CRITICAL' then 1 else 0 end desc, c.urgency desc, c.created_at asc;
$$;
revoke all on function public.search_challenges(text,text,text) from public;
grant execute on function public.search_challenges(text,text,text) to anon,authenticated;
