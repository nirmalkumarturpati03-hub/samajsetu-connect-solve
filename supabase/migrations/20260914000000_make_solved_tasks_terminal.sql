-- Solved is terminal: the problem leaves allocation queues and cannot be automatically rerouted.
create or replace function public.on_assignment_completed_close_challenge() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status in ('completed', 'verified') and old.status not in ('completed', 'verified') then
    update public.challenges set stage = 'impact' where id = new.challenge_id;
  end if;
  return new;
end;
$$;
drop trigger if exists assignment_completion_closes_challenge on public.problem_assignments;
create trigger assignment_completion_closes_challenge
  after update of status on public.problem_assignments
  for each row execute procedure public.on_assignment_completed_close_challenge();

-- Correct already-solved historical tasks, so they are also removed from allocation views.
update public.challenges c
set stage = 'impact'
where c.stage <> 'impact'
  and exists (
    select 1 from public.problem_assignments a
    where a.challenge_id = c.id and a.status in ('completed', 'verified')
  );

create or replace function public.on_assignment_unable_reassign() returns trigger language plpgsql security definer set search_path = public as $$
declare new_assignment uuid; excluded uuid[];
begin
  if new.status <> 'unable_to_resolve' or old.status = 'unable_to_resolve' then return new; end if;
  if exists (select 1 from public.challenges where id = new.challenge_id and stage = 'impact') then return new; end if;
  insert into public.task_assignment_exclusions (challenge_id, organization_id, failed_assignment_id, reason)
  values (new.challenge_id, new.organization_id, new.id, new.unable_reason)
  on conflict (challenge_id, organization_id) do update set reason = excluded.reason, excluded_at = now();
  select array_agg(distinct organization_id) into excluded from (
    select organization_id from public.problem_assignments where challenge_id = new.challenge_id
    union select organization_id from public.task_assignment_exclusions where challenge_id = new.challenge_id
  ) excluded_partners;
  new_assignment := public.allocate_smart_task(new.challenge_id, coalesce(excluded, '{}'));
  if new_assignment is not null then
    insert into public.problem_transfers (assignment_id, to_organization_id, reason)
    select new.id, organization_id, coalesce(new.unable_reason, 'Unable to resolve') from public.problem_assignments where id = new_assignment;
  end if;
  return new;
end;
$$;
