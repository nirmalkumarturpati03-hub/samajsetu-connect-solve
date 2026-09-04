-- A failed partner is permanently excluded from automatic reassignment for that problem.
create table public.task_assignment_exclusions (
  challenge_id uuid not null references public.challenges(id) on delete cascade,
  organization_id uuid not null references public.organization_accounts(id) on delete cascade,
  failed_assignment_id uuid not null references public.problem_assignments(id) on delete cascade,
  reason text,
  excluded_at timestamptz not null default now(),
  primary key (challenge_id, organization_id)
);

insert into public.task_assignment_exclusions (challenge_id, organization_id, failed_assignment_id, reason)
select challenge_id, organization_id, id, unable_reason
from public.problem_assignments
where status = 'unable_to_resolve'
on conflict (challenge_id, organization_id) do nothing;

create or replace function public.on_assignment_unable_reassign() returns trigger language plpgsql security definer set search_path = public as $$
declare new_assignment uuid; excluded uuid[];
begin
  if new.status <> 'unable_to_resolve' or old.status = 'unable_to_resolve' then return new; end if;
  insert into public.task_assignment_exclusions (challenge_id, organization_id, failed_assignment_id, reason)
  values (new.challenge_id, new.organization_id, new.id, new.unable_reason)
  on conflict (challenge_id, organization_id) do update set reason = excluded.reason, excluded_at = now();

  select array_agg(distinct organization_id) into excluded from (
    select organization_id from public.problem_assignments where challenge_id = new.challenge_id
    union
    select organization_id from public.task_assignment_exclusions where challenge_id = new.challenge_id
  ) excluded_partners;
  new_assignment := public.allocate_smart_task(new.challenge_id, coalesce(excluded, '{}'));
  if new_assignment is not null then
    insert into public.problem_transfers (assignment_id, to_organization_id, reason)
    select new.id, organization_id, coalesce(new.unable_reason, 'Unable to resolve')
    from public.problem_assignments where id = new_assignment;
  end if;
  return new;
end;
$$;

alter table public.task_assignment_exclusions enable row level security;
create policy "admins read assignment exclusions" on public.task_assignment_exclusions for select to authenticated
  using ((select role from public.profiles where id = auth.uid()) = 'admin');
