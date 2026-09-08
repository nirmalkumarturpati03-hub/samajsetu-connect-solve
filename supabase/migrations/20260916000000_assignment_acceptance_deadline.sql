-- Pending assignments expire after 48 hours. Expiry uses the existing failure/reassignment
-- trigger, so exclusions, rankings, transfers, and notifications follow the normal route.
alter table public.problem_assignments
  add column if not exists acceptance_deadline timestamptz;

update public.problem_assignments
set acceptance_deadline = created_at + interval '2 days'
where acceptance_deadline is null and status = 'pending';

alter table public.problem_assignments
  alter column acceptance_deadline set default (now() + interval '2 days');

create or replace function public.expire_unaccepted_assignments()
returns integer language plpgsql security definer set search_path = public as $$
declare expired_count integer; expired record; replacement uuid;
begin
  -- The unable-to-resolve trigger normally allocates the successor. Retain the expired
  -- rows here so we can guarantee a second allocation attempt if no live successor exists.
  for expired in
    update public.problem_assignments
    set status = 'unable_to_resolve',
        unable_reason = 'Assignment not accepted within 48 hours'
    where (
      status = 'pending'
      and accepted_at is null
      and coalesce(acceptance_deadline, created_at + interval '2 days') <= now()
    ) or (
      -- Repairs expired rows from an earlier scheduler run that did not find a successor.
      status = 'unable_to_resolve'
      and unable_reason = 'Assignment not accepted within 48 hours'
    )
    returning id, challenge_id, unable_reason
  loop
    if not exists (
      select 1 from public.problem_assignments a
      where a.challenge_id = expired.challenge_id
        and a.id <> expired.id
        and a.status not in ('completed', 'verified', 'unable_to_resolve')
    ) then
      select public.allocate_smart_task(
        expired.challenge_id,
        coalesce((select array_agg(organization_id) from public.task_assignment_exclusions where challenge_id = expired.challenge_id), '{}')
      ) into replacement;
      if replacement is not null then
        insert into public.problem_transfers (assignment_id, to_organization_id, reason)
        select expired.id, organization_id, expired.unable_reason
        from public.problem_assignments where id = replacement;
      end if;
    end if;
  end loop;
  get diagnostics expired_count = row_count;
  return expired_count;
end;
$$;

-- Supabase pg_cron runs this independently of a browser session.
create extension if not exists pg_cron;
select cron.schedule('samajsetu-expire-unaccepted-assignments', '*/5 * * * *', $$select public.expire_unaccepted_assignments();$$)
where not exists (select 1 from cron.job where jobname = 'samajsetu-expire-unaccepted-assignments');
