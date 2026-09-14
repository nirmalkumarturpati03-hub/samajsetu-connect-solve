-- Migration: 20261006000000_ulb_dashboard_rpcs.sql
-- Description: RPCs supporting ULB Municipal Dashboard workflows (direct challenge submission, duplicate merging, department assignment, SLA tracking, and citizen resolution feedback).

-- 1. RPC for ULBs to submit challenges directly
create or replace function public.ulb_submit_challenge(
  p_title text,
  p_summary text,
  p_domain text,
  p_district text,
  p_block text default null,
  p_locality text default null,
  p_latitude numeric default null,
  p_longitude numeric default null,
  p_severity smallint default 3,
  p_urgency smallint default 3,
  p_affected_population integer default null,
  p_department text default null,
  p_technical_scope text default null,
  p_expected_outcome text default null,
  p_constraints text default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_new_id uuid;
  v_public_id text;
  v_num integer;
begin
  select coalesce(max(nullif(regexp_replace(public_id, '\D', '', 'g'), '')::integer), 1000) + 1
  into v_num from public.challenges;
  
  v_public_id := 'ULB-' || v_num;
  
  insert into public.challenges (
    public_id,
    title,
    summary,
    domain,
    district,
    block,
    locality,
    public_latitude,
    public_longitude,
    severity,
    urgency,
    affected_population,
    responsible_department,
    technical_scope,
    expected_outcome,
    constraints,
    verification,
    stage,
    priority_score,
    priority_level,
    created_by,
    created_at,
    updated_at
  ) values (
    v_public_id,
    trim(p_title),
    trim(p_summary),
    trim(p_domain),
    trim(p_district),
    nullif(trim(p_block), ''),
    nullif(trim(p_locality), ''),
    p_latitude,
    p_longitude,
    coalesce(p_severity, 3),
    coalesce(p_urgency, 3),
    p_affected_population,
    nullif(trim(p_department), ''),
    nullif(trim(p_technical_scope), ''),
    nullif(trim(p_expected_outcome), ''),
    nullif(trim(p_constraints), ''),
    'officially_verified',
    case when p_technical_scope is not null and trim(p_technical_scope) <> '' then 'validated' else 'reported' end,
    least(100, greatest(20, (coalesce(p_severity, 3) * 12 + coalesce(p_urgency, 3) * 12))),
    case 
      when (coalesce(p_severity, 3) + coalesce(p_urgency, 3)) >= 7 then 'CRITICAL'
      when (coalesce(p_severity, 3) + coalesce(p_urgency, 3)) >= 5 then 'HIGH'
      else 'MEDIUM'
    end,
    auth.uid(),
    now(),
    now()
  ) returning id into v_new_id;

  -- Create initial priority analysis record for AI assessment
  insert into public.priority_analysis (
    challenge_id,
    validated_factors,
    confidence,
    analysis_status,
    ai_analysis
  ) values (
    v_new_id,
    jsonb_build_object(
      'submitted_by', 'Urban Local Body',
      'source', 'ULB Municipal Portal',
      'category_verified', true,
      'location_captured', p_latitude is not null,
      'evidence_consistency', 95
    ),
    92,
    'analyzed',
    jsonb_build_object(
      'reasons', jsonb_build_array('Official municipal submission', 'Department verification complete')
    )
  );

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (
    auth.uid(),
    'ulb_challenge_submitted',
    'challenge',
    v_new_id,
    jsonb_build_object('public_id', v_public_id, 'department', p_department)
  );

  return v_new_id;
end;
$$;
grant execute on function public.ulb_submit_challenge(text, text, text, text, text, text, numeric, numeric, smallint, smallint, integer, text, text, text, text) to authenticated;

-- 2. RPC to merge duplicate challenges
create or replace function public.ulb_merge_challenges(
  master_uuid uuid,
  duplicate_uuid uuid,
  merge_note text default 'Merged as duplicate by ULB officer'
) returns void language plpgsql security definer set search_path = public as $$
declare
  actor_role public.app_role;
begin
  select role into actor_role from public.profiles where id = auth.uid();
  if auth.uid() is null or actor_role not in ('admin', 'government') then
    raise exception 'Only authorized ULB officials or administrators can merge challenges';
  end if;

  update public.challenges set
    merged_into_id = master_uuid,
    duplicate_status = 'merged',
    rejection_reason = merge_note,
    updated_at = now()
  where id = duplicate_uuid;

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (
    auth.uid(),
    'challenge_merged',
    'challenge',
    duplicate_uuid,
    jsonb_build_object('master_id', master_uuid, 'note', merge_note)
  );
end;
$$;
grant execute on function public.ulb_merge_challenges(uuid, uuid, text) to authenticated;

-- 3. RPC to assign department / officer with deadline & SLA
create or replace function public.ulb_assign_department(
  challenge_uuid uuid,
  dept_name text,
  deadline_timestamp timestamptz,
  officer_note text default null,
  assigned_priority text default null
) returns void language plpgsql security definer set search_path = public as $$
declare
  actor_role public.app_role;
begin
  select role into actor_role from public.profiles where id = auth.uid();
  if auth.uid() is null or actor_role not in ('admin', 'government') then
    raise exception 'Only authorized ULB officials can assign challenges';
  end if;

  update public.challenges set
    responsible_department = trim(dept_name),
    stage = 'assigned',
    priority_level = coalesce(assigned_priority, priority_level),
    updated_at = now()
  where id = challenge_uuid;

  -- Create or update assignment record with deadline
  insert into public.problem_assignments (
    challenge_id,
    assigned_by,
    status,
    acceptance_deadline,
    created_at
  ) values (
    challenge_uuid,
    auth.uid(),
    'accepted',
    deadline_timestamp,
    now()
  );

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (
    auth.uid(),
    'ulb_department_assigned',
    'challenge',
    challenge_uuid,
    jsonb_build_object('department', dept_name, 'deadline', deadline_timestamp, 'note', officer_note)
  );
end;
$$;
grant execute on function public.ulb_assign_department(uuid, text, timestamptz, text, text) to authenticated;

-- 4. RPC for citizen verification feedback loop
create or replace function public.ulb_submit_resolution_feedback(
  challenge_uuid uuid,
  feedback_verdict text, -- 'resolved' or 'unresolved'
  feedback_comment text default null
) returns void language plpgsql security definer set search_path = public as $$
begin
  if feedback_verdict = 'unresolved' then
    update public.challenges set
      stage = 'assigned',
      updated_at = now()
    where id = challenge_uuid;

    insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
    values (
      auth.uid(),
      'challenge_reopened_by_citizen',
      'challenge',
      challenge_uuid,
      jsonb_build_object('comment', feedback_comment)
    );
  else
    update public.challenges set
      stage = 'completed',
      updated_at = now()
    where id = challenge_uuid;

    insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
    values (
      auth.uid(),
      'challenge_resolution_confirmed',
      'challenge',
      challenge_uuid,
      jsonb_build_object('comment', feedback_comment)
    );
  end if;

  -- Insert comment if note provided
  if feedback_comment is not null and trim(feedback_comment) <> '' then
    insert into public.comments (challenge_id, author_id, note)
    values (challenge_uuid, auth.uid(), 'Citizen Feedback: ' || trim(feedback_comment));
  end if;
end;
$$;
grant execute on function public.ulb_submit_resolution_feedback(uuid, text, text) to anon, authenticated;