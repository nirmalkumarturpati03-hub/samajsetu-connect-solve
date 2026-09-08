-- Persist partner team management and task participation. This extends the
-- existing organization delivery workflow without removing historical rows.

alter type public.task_status add value if not exists 'accepted' after 'pending';

alter table public.volunteers
  add column if not exists member_identifier text,
  add column if not exists updated_at timestamptz not null default now();
create unique index if not exists volunteers_organization_identifier_unique
  on public.volunteers(organization_id, member_identifier)
  where member_identifier is not null;
create index if not exists volunteers_organization_availability_idx
  on public.volunteers(organization_id, availability);
create index if not exists problem_tasks_assignment_idx on public.problem_tasks(assignment_id, created_at);
create unique index if not exists problem_tasks_assignment_volunteer_unique
  on public.problem_tasks(assignment_id, volunteer_id)
  where volunteer_id is not null;

-- Assigning people is a transaction: task rows are reconciled against the
-- submitted member list, so a page refresh cannot produce a different team.
create or replace function public.set_assignment_participants(assignment_uuid uuid, volunteer_uuids uuid[])
returns void language plpgsql security definer set search_path = public as $$
declare org_uuid uuid;
begin
  select organization_id into org_uuid from public.problem_assignments where id = assignment_uuid for update;
  if org_uuid is null then raise exception 'Assignment not found'; end if;
  if not exists (select 1 from public.organization_accounts where id = org_uuid and owner_id = auth.uid()) then
    raise exception 'Not authorised to manage this assignment';
  end if;
  if exists (select 1 from unnest(coalesce(volunteer_uuids, '{}')) item(id) left join public.volunteers v on v.id = item.id where v.id is null or v.organization_id <> org_uuid) then
    raise exception 'Every participant must belong to this organization';
  end if;
  delete from public.problem_tasks where assignment_id = assignment_uuid and volunteer_id is not null and not (volunteer_id = any(coalesce(volunteer_uuids, '{}')));
  insert into public.problem_tasks(assignment_id, volunteer_id, description, status, assigned_at)
  select assignment_uuid, v.id, 'Partner task contribution', 'accepted', now()
  from public.volunteers v where v.id = any(coalesce(volunteer_uuids, '{}'))
  on conflict do nothing;
  update public.problem_assignments set status = 'accepted', accepted_at = coalesce(accepted_at, now()) where id = assignment_uuid and status = 'pending';
  insert into public.audit_logs(actor_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), 'assignment_participants_set', 'problem_assignment', assignment_uuid,
    jsonb_build_object('participant_ids', coalesce(volunteer_uuids, '{}')));
end;
$$;
revoke all on function public.set_assignment_participants(uuid, uuid[]) from public;
grant execute on function public.set_assignment_participants(uuid, uuid[]) to authenticated;

create or replace function public.mark_assignment_progress(
  assignment_uuid uuid, next_status public.task_status, progress_note text default null
) returns void language plpgsql security definer set search_path = public as $$
declare prior_status public.task_status;
begin
  if next_status not in ('accepted', 'in_progress', 'completed', 'unable_to_resolve') then raise exception 'Invalid partner lifecycle status'; end if;
  select status into prior_status from public.problem_assignments where id = assignment_uuid for update;
  if prior_status is null then raise exception 'Assignment not found'; end if;
  if not exists (select 1 from public.problem_assignments a join public.organization_accounts o on o.id = a.organization_id where a.id = assignment_uuid and o.owner_id = auth.uid()) then raise exception 'Not authorised'; end if;
  update public.problem_assignments set
    status = next_status,
    accepted_at = case when next_status = 'accepted' then coalesce(accepted_at, now()) else accepted_at end,
    started_at = case when next_status = 'in_progress' then coalesce(started_at, now()) else started_at end,
    resolved_at = case when next_status = 'completed' then now() else resolved_at end,
    completion_note = case when next_status = 'completed' then nullif(left(progress_note, 5000), '') else completion_note end,
    unable_reason = case when next_status = 'unable_to_resolve' then nullif(left(progress_note, 5000), '') else unable_reason end,
    completed_by = case when next_status = 'completed' then auth.uid() else completed_by end
  where id = assignment_uuid;
  update public.problem_tasks set
    status = case when next_status = 'completed' then 'completed' when next_status = 'in_progress' then 'in_progress' when next_status = 'accepted' then 'accepted' else status end,
    started_at = case when next_status = 'in_progress' then coalesce(started_at, now()) else started_at end,
    completed_at = case when next_status = 'completed' then now() else completed_at end,
    completion_note = case when next_status = 'completed' then nullif(left(progress_note, 5000), '') else completion_note end,
    progress = case when next_status = 'completed' then 100 when next_status = 'in_progress' then greatest(progress, 1) else progress end
  where assignment_id = assignment_uuid;
  insert into public.audit_logs(actor_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), 'assignment_lifecycle_updated', 'problem_assignment', assignment_uuid,
    jsonb_build_object('old_status', prior_status, 'new_status', next_status, 'note', progress_note));
end;
$$;
revoke all on function public.mark_assignment_progress(uuid, public.task_status, text) from public;
grant execute on function public.mark_assignment_progress(uuid, public.task_status, text) to authenticated;
