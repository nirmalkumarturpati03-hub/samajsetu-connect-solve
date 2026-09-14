-- 20261005000000_civic_innovation_lifecycle.sql
-- Real Government–Citizen–University–Industry Collaboration Flow

-- 1. Extend challenges table with technical scope and adoption fields
alter table public.challenges
  add column if not exists technical_scope text,
  add column if not exists expected_outcome text,
  add column if not exists constraints text,
  add column if not exists government_data text,
  add column if not exists regulatory_requirements text,
  add column if not exists safety_requirements text,
  add column if not exists pilot_requirements text,
  add column if not exists evaluation_criteria text,
  add column if not exists support_needed text[] not null default '{}',
  add column if not exists responsible_department text,
  add column if not exists scope_defined_at timestamptz,
  add column if not exists scope_defined_by uuid references public.profiles(id),
  add column if not exists rejection_reason text,
  add column if not exists adoption_status text not null default 'not_started'
    check (adoption_status in ('not_started', 'pilot_successful', 'adoption_recommended', 'scaling_approved', 'scaling_in_progress', 'scaled')),
  add column if not exists scaling_details jsonb not null default '{}'::jsonb;

-- 2. Extend pilots table with government conditions, monitoring, and approval audit
alter table public.pilots
  add column if not exists pilot_conditions text,
  add column if not exists monitoring_requirements text,
  add column if not exists rejection_reason text,
  add column if not exists reviewed_by uuid references public.profiles(id),
  add column if not exists reviewed_at timestamptz;

-- 3. Government validation & technical scope RPC
create or replace function public.define_government_scope(
  challenge_uuid uuid,
  dept text,
  scope_text text,
  outcome_text text default null,
  constraints_text text default null,
  gov_data text default null,
  reg_req text default null,
  safety_req text default null,
  pilot_req text default null,
  eval_crit text default null,
  needed_support text[] default '{}'
) returns void language plpgsql security definer set search_path = public as $$
declare
  actor_role public.app_role;
  chall_row record;
begin
  select role into actor_role from public.profiles where id = auth.uid();
  if auth.uid() is null or actor_role not in ('admin', 'government') then
    raise exception 'Only authorized government officials or administrators can define technical scopes';
  end if;

  select * into chall_row from public.challenges where id = challenge_uuid for update;
  if chall_row.id is null then
    raise exception 'Challenge not found';
  end if;

  update public.challenges set
    responsible_department = nullif(trim(dept), ''),
    technical_scope = nullif(trim(scope_text), ''),
    expected_outcome = nullif(trim(outcome_text), ''),
    constraints = nullif(trim(constraints_text), ''),
    government_data = nullif(trim(gov_data), ''),
    regulatory_requirements = nullif(trim(reg_req), ''),
    safety_requirements = nullif(trim(safety_req), ''),
    pilot_requirements = nullif(trim(pilot_req), ''),
    evaluation_criteria = nullif(trim(eval_crit), ''),
    support_needed = coalesce(needed_support, '{}'),
    scope_defined_at = now(),
    scope_defined_by = auth.uid(),
    verification = case when verification = 'unverified' then 'officially_verified' else verification end,
    stage = case when stage in ('reported', 'validated') then 'validated' else stage end,
    updated_at = now()
  where id = challenge_uuid;

  insert into public.audit_logs(actor_id, action, entity_type, entity_id, metadata)
  values (
    auth.uid(),
    'government_scope_defined',
    'challenge',
    challenge_uuid,
    jsonb_build_object(
      'department', dept,
      'has_scope', scope_text is not null,
      'support_needed', needed_support
    )
  );

  -- Notify challenge creator if profile exists
  if chall_row.created_by is not null then
    insert into public.notifications(recipient_id, kind, title, body, entity_type, entity_id)
    values (
      chall_row.created_by,
      'challenge_scoped',
      'Government defined technical scope for your challenge',
      'Responsible department ' || coalesce(dept, 'Government') || ' has validated your challenge and specified engineering requirements for university teams.',
      'challenge',
      challenge_uuid
    );
  end if;
end;
$$;
revoke all on function public.define_government_scope(uuid, text, text, text, text, text, text, text, text, text, text[]) from public;
grant execute on function public.define_government_scope(uuid, text, text, text, text, text, text, text, text, text, text[]) to authenticated;

-- 4. Government reject citizen report RPC
create or replace function public.reject_citizen_challenge(
  challenge_uuid uuid,
  reason_text text
) returns void language plpgsql security definer set search_path = public as $$
declare
  actor_role public.app_role;
  chall_row record;
begin
  select role into actor_role from public.profiles where id = auth.uid();
  if auth.uid() is null or actor_role not in ('admin', 'government') then
    raise exception 'Only authorized government officials or administrators can reject reports';
  end if;

  select * into chall_row from public.challenges where id = challenge_uuid for update;
  if chall_row.id is null then raise exception 'Challenge not found'; end if;

  update public.challenges set
    rejection_reason = trim(reason_text),
    duplicate_status = 'rejected',
    updated_at = now()
  where id = challenge_uuid;

  insert into public.audit_logs(actor_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), 'challenge_rejected', 'challenge', challenge_uuid, jsonb_build_object('reason', reason_text));

  if chall_row.created_by is not null then
    insert into public.notifications(recipient_id, kind, title, body, entity_type, entity_id)
    values (
      chall_row.created_by,
      'challenge_rejected',
      'Update on your reported challenge',
      'Government review: ' || left(reason_text, 300),
      'challenge',
      challenge_uuid
    );
  end if;
end;
$$;
revoke all on function public.reject_citizen_challenge(uuid, text) from public;
grant execute on function public.reject_citizen_challenge(uuid, text) to authenticated;

-- 5. Government pilot review & approval RPC
create or replace function public.review_pilot_approval(
  pilot_uuid uuid,
  next_status text,
  conditions_text text default null,
  monitoring_text text default null,
  reject_note text default null
) returns void language plpgsql security definer set search_path = public as $$
declare
  actor_role public.app_role;
  pilot_row record;
begin
  select role into actor_role from public.profiles where id = auth.uid();
  if auth.uid() is null or actor_role not in ('admin', 'government') then
    raise exception 'Only authorized government officials can approve or reject pilots';
  end if;

  if next_status not in ('approved', 'running', 'completed', 'verified', 'planned') then
    raise exception 'Invalid pilot status';
  end if;

  select * into pilot_row from public.pilots where id = pilot_uuid for update;
  if pilot_row.id is null then raise exception 'Pilot record not found'; end if;

  update public.pilots set
    status = next_status,
    pilot_conditions = coalesce(nullif(trim(conditions_text), ''), pilot_conditions),
    monitoring_requirements = coalesce(nullif(trim(monitoring_text), ''), monitoring_requirements),
    rejection_reason = case when next_status = 'planned' then nullif(trim(reject_note), '') else rejection_reason end,
    government_verified_at = case when next_status in ('approved', 'verified') then now() else government_verified_at end,
    reviewed_by = auth.uid(),
    reviewed_at = now()
  where id = pilot_uuid;

  -- Advance challenge stage to pilot
  update public.challenges set stage = 'pilot', updated_at = now()
  where id = (select challenge_id from public.projects where id = pilot_row.project_id);

  insert into public.audit_logs(actor_id, action, entity_type, entity_id, metadata)
  values (
    auth.uid(),
    'pilot_review_updated',
    'pilot',
    pilot_uuid,
    jsonb_build_object('next_status', next_status, 'conditions', conditions_text, 'rejection', reject_note)
  );
end;
$$;
revoke all on function public.review_pilot_approval(uuid, text, text, text, text) from public;
grant execute on function public.review_pilot_approval(uuid, text, text, text, text) to authenticated;

-- 6. Government adoption and scaling RPC
create or replace function public.update_adoption_scaling(
  challenge_uuid uuid,
  next_adoption_status text,
  scaling_meta jsonb default '{}'::jsonb
) returns void language plpgsql security definer set search_path = public as $$
declare
  actor_role public.app_role;
begin
  select role into actor_role from public.profiles where id = auth.uid();
  if auth.uid() is null or actor_role not in ('admin', 'government') then
    raise exception 'Only authorized government officials can approve adoption and scaling';
  end if;

  if next_adoption_status not in ('not_started', 'pilot_successful', 'adoption_recommended', 'scaling_approved', 'scaling_in_progress', 'scaled') then
    raise exception 'Invalid adoption status';
  end if;

  update public.challenges set
    adoption_status = next_adoption_status,
    scaling_details = coalesce(scaling_details, '{}'::jsonb) || coalesce(scaling_meta, '{}'::jsonb),
    stage = case when next_adoption_status in ('scaling_approved', 'scaling_in_progress', 'scaled') then 'impact' else stage end,
    updated_at = now()
  where id = challenge_uuid;

  insert into public.audit_logs(actor_id, action, entity_type, entity_id, metadata)
  values (
    auth.uid(),
    'adoption_scaling_updated',
    'challenge',
    challenge_uuid,
    jsonb_build_object('adoption_status', next_adoption_status, 'scaling_details', scaling_meta)
  );
end;
$$;
revoke all on function public.update_adoption_scaling(uuid, text, jsonb) from public;
grant execute on function public.update_adoption_scaling(uuid, text, jsonb) to authenticated;

-- 7. Industry / CSR collaboration commitment RPC
create or replace function public.express_industry_collaboration(
  project_uuid uuid,
  support_category text,
  commitment_amount numeric default null,
  note_text text default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  org_id uuid;
  commitment_id uuid;
  proj_row record;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;

  select id into org_id from public.organization_accounts where owner_id = auth.uid() limit 1;

  select * into proj_row from public.projects where id = project_uuid;
  if proj_row.id is null then raise exception 'Innovation project not found'; end if;

  insert into public.funding_commitments(project_id, organization_id, amount, status, source_type)
  values (project_uuid, org_id, coalesce(commitment_amount, 0), 'interest', support_category)
  returning id into commitment_id;

  insert into public.project_members(project_id, profile_id, role, status)
  values (project_uuid, auth.uid(), 'Industry Partner (' || support_category || ')', 'active')
  on conflict (project_id, profile_id) do update set status = 'active';

  insert into public.audit_logs(actor_id, action, entity_type, entity_id, metadata)
  values (
    auth.uid(),
    'industry_collaboration_expressed',
    'project',
    project_uuid,
    jsonb_build_object('support_category', support_category, 'amount', commitment_amount, 'note', note_text)
  );

  return commitment_id;
end;
$$;
revoke all on function public.express_industry_collaboration(uuid, text, numeric, text) from public;
grant execute on function public.express_industry_collaboration(uuid, text, numeric, text) to authenticated;

-- 8. Updated search_challenges exposing real scope, university institution, and adoption details
drop function if exists public.search_challenges(text, text, text);

create or replace function public.search_challenges(
  search_text text default '',
  district_filter text default null,
  domain_filter text default null
)
returns table (
  id uuid,
  public_id text,
  title text,
  summary text,
  domain text,
  district text,
  priority_score smallint,
  priority_level text,
  verification public.verification_status,
  stage public.project_stage,
  affected_population integer,
  reports bigint,
  reposts bigint,
  created_at timestamptz,
  preview_image_path text,
  media jsonb,
  comments jsonb,
  public_latitude numeric,
  public_longitude numeric,
  assignment_status text,
  participant_count integer,
  technical_scope text,
  expected_outcome text,
  constraints text,
  government_data text,
  regulatory_requirements text,
  safety_requirements text,
  pilot_requirements text,
  evaluation_criteria text,
  support_needed text[],
  responsible_department text,
  scope_defined_at timestamptz,
  rejection_reason text,
  adoption_status text,
  scaling_details jsonb,
  project_id uuid,
  project_title text,
  university_name text,
  prototype_count integer,
  pilot_count integer,
  feedback_count integer,
  impact_count integer,
  funding_count integer
)
language sql stable security definer set search_path = public as $$
  select
    c.id,
    c.public_id,
    c.title,
    c.summary,
    c.domain,
    c.district,
    c.priority_score,
    c.priority_level,
    c.verification,
    c.stage,
    c.affected_population,
    coalesce((select count(*) from public.reports r where r.challenge_id = c.id), 0),
    coalesce((select count(*) from public.challenge_supports s where s.challenge_id = c.id), 0),
    c.created_at,
    c.preview_image_path,
    coalesce((select jsonb_agg(jsonb_build_object('path', cm.storage_path, 'type', cm.mime_type) order by cm.created_at)
      from public.challenge_media cm where cm.challenge_id = c.id), '[]'::jsonb),
    coalesce((select jsonb_agg(jsonb_build_object('id', s.id, 'note', s.note, 'created_at', s.created_at) order by s.created_at desc)
      from public.challenge_supports s where s.challenge_id = c.id and s.note is not null and btrim(s.note) <> ''), '[]'::jsonb),
    c.public_latitude,
    c.public_longitude,
    latest.status::text,
    coalesce(latest.participant_count, 0)::integer,
    c.technical_scope,
    c.expected_outcome,
    c.constraints,
    c.government_data,
    c.regulatory_requirements,
    c.safety_requirements,
    c.pilot_requirements,
    c.evaluation_criteria,
    coalesce(c.support_needed, '{}'),
    c.responsible_department,
    c.scope_defined_at,
    c.rejection_reason,
    c.adoption_status,
    coalesce(c.scaling_details, '{}'::jsonb),
    proj.id as project_id,
    proj.title as project_title,
    coalesce(uni_org.name, uni_prof.display_name) as university_name,
    coalesce((select count(*)::integer from public.prototypes pt where pt.project_id = proj.id), 0),
    coalesce((select count(*)::integer from public.pilots pl where pl.project_id = proj.id), 0),
    coalesce((select count(*)::integer from public.community_feedback cf where cf.project_id = proj.id), 0),
    coalesce((select count(*)::integer from public.impact_observations io where io.project_id = proj.id), 0),
    coalesce((select count(*)::integer from public.funding_commitments fc where fc.project_id = proj.id), 0)
  from public.challenges c
  left join lateral (
    select a.status, (select count(*) from public.problem_tasks t where t.assignment_id = a.id) as participant_count
    from public.problem_assignments a where a.challenge_id = c.id order by a.created_at desc limit 1
  ) latest on true
  left join lateral (
    select p.id, p.title, p.created_by
    from public.projects p where p.challenge_id = c.id limit 1
  ) proj on true
  left join public.profiles uni_prof on uni_prof.id = proj.created_by
  left join public.organization_accounts uni_org on uni_org.owner_id = proj.created_by
  where c.merged_into_id is null
    and (c.rejection_reason is null or c.rejection_reason = '')
    and (search_text = '' or c.title ilike '%' || search_text || '%' or c.domain ilike '%' || search_text || '%' or c.summary ilike '%' || search_text || '%')
    and (district_filter is null or c.district = district_filter)
    and (domain_filter is null or c.domain = domain_filter)
  order by c.priority_score desc, case when c.priority_level = 'CRITICAL' then 1 else 0 end desc, c.urgency desc, c.created_at asc;
$$;

revoke all on function public.search_challenges(text, text, text) from public;
grant execute on function public.search_challenges(text, text, text) to anon, authenticated;

-- 8. Government report review returning quad-helix scoping and evidence
drop function if exists public.admin_problem_review();
create or replace function public.admin_problem_review()
returns table(
  challenge_id uuid, public_id text, title text, summary text, domain text, district text, block text, locality text,
  public_latitude numeric, public_longitude numeric, severity smallint, urgency smallint, affected_population integer,
  created_at timestamptz, priority_score smallint, priority_level text, report_id uuid, report_description text,
  report_latitude numeric, report_longitude numeric, consent_location boolean, consent_media boolean,
  voice_transcript text, evidence jsonb,
  responsible_department text, technical_scope text, expected_outcome text, constraints text,
  government_data text, regulatory_requirements text, safety_requirements text,
  pilot_requirements text, evaluation_criteria text, support_needed text[],
  scope_defined_at timestamptz, rejection_reason text, duplicate_status text
)
language sql stable security definer set search_path = public as $$
  select
    c.id, c.public_id, c.title, c.summary, c.domain, c.district, c.block, c.locality,
    c.public_latitude, c.public_longitude, c.severity, c.urgency, c.affected_population,
    c.created_at, c.priority_score, c.priority_level,
    r.id, r.description, r.latitude, r.longitude, r.consent_location, r.consent_media,
    r.voice_transcript,
    coalesce(
      (select jsonb_agg(jsonb_build_object('path', e.storage_path, 'mime_type', e.mime_type, 'size_bytes', e.size_bytes, 'created_at', e.created_at) order by e.created_at)
       from public.evidence e where e.report_id = r.id),
      '[]'::jsonb
    ) as evidence,
    c.responsible_department, c.technical_scope, c.expected_outcome, c.constraints,
    c.government_data, c.regulatory_requirements, c.safety_requirements,
    c.pilot_requirements, c.evaluation_criteria, c.support_needed,
    c.scope_defined_at, c.rejection_reason, c.duplicate_status
  from public.challenges c
  left join public.reports r on r.challenge_id = c.id
  where (select role from public.profiles where id = auth.uid()) in ('admin', 'government')
    and c.merged_into_id is null
  order by c.priority_assigned_at nulls first, c.created_at asc;
$$;
revoke all on function public.admin_problem_review() from public, anon;
grant execute on function public.admin_problem_review() to authenticated;
