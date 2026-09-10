-- Operations-led workflow: citizens report/repost without a visible account;
-- authorised administrators review full evidence, set priority, then allocation starts.

alter table public.challenges
  add column if not exists priority_assigned_by uuid references public.profiles(id),
  add column if not exists priority_assigned_at timestamptz,
  add column if not exists priority_assignment_note text;

-- Stop all automatic priority mutations (including historic AI/fallback paths).
create or replace function public.refresh_challenge_priority(challenge_uuid uuid) returns void
language plpgsql security definer set search_path = public as $$ begin return; end; $$;
drop trigger if exists challenge_priority_input_changed on public.challenges;

-- Allocation is deliberately not started when a citizen submits a report.
drop trigger if exists challenge_smart_allocation on public.challenges;

create or replace function public.assign_problem_priority(challenge_uuid uuid, assigned_score smallint, assignment_note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare prior_score smallint; assigned_level text;
begin
  if auth.uid() is null or (select role from public.profiles where id = auth.uid()) <> 'admin' then raise exception 'Only administrators may assign a problem priority'; end if;
  if assigned_score not between 0 and 100 then raise exception 'Priority score must be between 0 and 100'; end if;
  select priority_score into prior_score from public.challenges where id = challenge_uuid for update;
  if not found then raise exception 'Challenge not found'; end if;
  assigned_level := case when assigned_score >= 90 then 'CRITICAL' when assigned_score >= 75 then 'HIGH' when assigned_score >= 50 then 'MEDIUM' when assigned_score >= 25 then 'LOW' else 'MINOR' end;
  update public.challenges set priority_score=assigned_score, priority_level=assigned_level, priority_assigned_by=auth.uid(), priority_assigned_at=now(), priority_assignment_note=nullif(btrim(assignment_note), ''), priority_manual_override=true, priority_analysis_status='MANUALLY_REVIEWED', priority_review_status='MANUALLY_REVIEWED' where id=challenge_uuid;
  insert into public.priority_score_events(challenge_id,actor_id,previous_score,new_score,factors,scoring_version,reason) values(challenge_uuid,auth.uid(),prior_score,assigned_score,jsonb_build_object('admin_assigned',true),'admin-priority-v1',coalesce(nullif(btrim(assignment_note),''),'Administrator assigned priority after reviewing report details.'));
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,metadata) values(auth.uid(),'priority_assigned_by_admin','challenge',challenge_uuid,jsonb_build_object('previous_score',prior_score,'new_score',assigned_score,'note',assignment_note));
  perform public.allocate_smart_task(challenge_uuid);
end;
$$;
grant execute on function public.assign_problem_priority(uuid,smallint,text) to authenticated;

-- Admin-only report review returns the citizen submission including precise location
-- and private evidence metadata. It is never exposed through public discovery.
create or replace function public.admin_problem_review()
returns table(challenge_id uuid, public_id text, title text, summary text, domain text, district text, block text, locality text, public_latitude numeric, public_longitude numeric, severity smallint, urgency smallint, affected_population integer, created_at timestamptz, priority_score smallint, priority_level text, report_id uuid, report_description text, report_latitude numeric, report_longitude numeric, consent_location boolean, consent_media boolean, voice_transcript text, evidence jsonb)
language sql stable security definer set search_path=public as $$
  select c.id,c.public_id,c.title,c.summary,c.domain,c.district,c.block,c.locality,c.public_latitude,c.public_longitude,c.severity,c.urgency,c.affected_population,c.created_at,c.priority_score,c.priority_level,r.id,r.description,r.latitude,r.longitude,r.consent_location,r.consent_media,r.voice_transcript,
  coalesce((select jsonb_agg(jsonb_build_object('path',e.storage_path,'mime_type',e.mime_type,'size_bytes',e.size_bytes,'created_at',e.created_at) order by e.created_at) from public.evidence e where e.report_id=r.id),'[]'::jsonb)
  from public.challenges c left join public.reports r on r.challenge_id=c.id
  where (select role from public.profiles where id=auth.uid())='admin' and c.merged_into_id is null
  order by c.priority_assigned_at nulls first,c.created_at asc;
$$;
revoke all on function public.admin_problem_review() from public, anon;
grant execute on function public.admin_problem_review() to authenticated;

-- Duplicate checks privilege exact/similar titles and use category/location only as corroboration.
create or replace function public.find_possible_duplicates(problem_title text, problem_description text, problem_domain text, problem_lat numeric, problem_lng numeric)
returns table(challenge_id uuid, public_id text, title text, domain text, text_similarity numeric, location_similarity numeric, category_match numeric, duplicate_score numeric)
language sql stable security definer set search_path = public as $$
  with input as (select lower(regexp_replace(trim(problem_title),'[^[:alnum:]]+','','g')) title_key),
  tokens as (select distinct lower(word) word from regexp_split_to_table(problem_title || ' ' || coalesce(problem_description,''), '\s+') word where length(word)>2),
  scored as (select c.id,c.public_id,c.title,c.domain,c.created_at,
    case when lower(regexp_replace(trim(c.title),'[^[:alnum:]]+','','g'))=(select title_key from input) then 100 else round(coalesce((select count(*) from tokens t where lower(c.title || ' ' || c.summary) like '%'||t.word||'%'),0)::numeric/greatest(1,(select count(*) from tokens))*100,2) end text_similarity,
    round(case when problem_lat is null or problem_lng is null then 0 else greatest(0,100-least(100,coalesce(public.haversine_km(problem_lat,problem_lng,c.public_latitude,c.public_longitude),1000)*10)) end,2) location_similarity,
    case when lower(c.domain)=lower(problem_domain) then 100 else 0 end category_match
    from public.challenges c where c.merged_into_id is null)
  select id,public_id,title,domain,text_similarity,location_similarity,category_match,round(text_similarity*.65+location_similarity*.20+category_match*.15,2)
  from scored where text_similarity>=45 or (category_match=100 and location_similarity>=70) order by 8 desc,created_at desc limit 5;
$$;
grant execute on function public.find_possible_duplicates(text,text,text,numeric,numeric) to anon,authenticated;
