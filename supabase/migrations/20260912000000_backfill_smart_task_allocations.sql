-- Evaluate the backlog with the same algorithm used for newly reported problems.
-- Existing active/manual assignments are intentionally preserved and are not overwritten.
select public.allocate_smart_task(c.id)
from public.challenges c
where c.stage <> 'impact'
  and not exists (
  select 1
  from public.problem_assignments a
  where a.challenge_id = c.id
    and a.status not in ('completed', 'verified', 'unable_to_resolve')
);
