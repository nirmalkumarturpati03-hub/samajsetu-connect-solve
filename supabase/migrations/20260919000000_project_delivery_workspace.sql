-- Project delivery workspace. Existing project entities are retained and made
-- writable only by authorised delivery roles.
alter table public.projects add column if not exists status text not null default 'planning'
  check (status in ('planning','active','blocked','completed','archived'));
alter table public.milestones add column if not exists description text;

create or replace function public.create_innovation_project(
  challenge_uuid uuid, project_title text, project_objective text, outcome text default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare project_uuid uuid; actor_role public.app_role;
begin
  select role into actor_role from public.profiles where id = auth.uid();
  if auth.uid() is null or actor_role not in ('admin','government','university_admin','faculty') then raise exception 'Not authorised to create innovation projects'; end if;
  if not exists (select 1 from public.challenges where id = challenge_uuid and verification in ('community_verified','officially_verified')) then raise exception 'Only verified challenges can become innovation projects'; end if;
  insert into public.projects(challenge_id, title, objective, expected_outcome, created_by, status)
  values (challenge_uuid, left(trim(project_title), 240), left(trim(project_objective), 5000), nullif(left(outcome, 5000), ''), auth.uid(), 'planning')
  on conflict (challenge_id) do update set title = excluded.title, objective = excluded.objective, expected_outcome = excluded.expected_outcome
  returning id into project_uuid;
  update public.challenges set stage = 'project' where id = challenge_uuid;
  insert into public.project_members(project_id, profile_id, role, status) values (project_uuid, auth.uid(), 'Project owner', 'active') on conflict do nothing;
  insert into public.audit_logs(actor_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), 'innovation_project_created', 'project', project_uuid, jsonb_build_object('challenge_id', challenge_uuid));
  return project_uuid;
end;
$$;
revoke all on function public.create_innovation_project(uuid, text, text, text) from public;
grant execute on function public.create_innovation_project(uuid, text, text, text) to authenticated;

drop policy if exists "staff updates projects" on public.projects;
create policy "staff updates projects" on public.projects for update to authenticated
using ((select role from public.profiles where id = auth.uid()) in ('admin','government','university_admin','faculty'))
with check ((select role from public.profiles where id = auth.uid()) in ('admin','government','university_admin','faculty'));
drop policy if exists "staff manages milestones" on public.milestones;
create policy "staff manages milestones" on public.milestones for all to authenticated
using ((select role from public.profiles where id = auth.uid()) in ('admin','government','university_admin','faculty'))
with check ((select role from public.profiles where id = auth.uid()) in ('admin','government','university_admin','faculty'));
drop policy if exists "staff manages prototypes" on public.prototypes;
create policy "staff manages prototypes" on public.prototypes for all to authenticated
using ((select role from public.profiles where id = auth.uid()) in ('admin','government','university_admin','faculty'))
with check ((select role from public.profiles where id = auth.uid()) in ('admin','government','university_admin','faculty'));
drop policy if exists "staff manages pilots" on public.pilots;
create policy "staff manages pilots" on public.pilots for all to authenticated
using ((select role from public.profiles where id = auth.uid()) in ('admin','government','university_admin','faculty'))
with check ((select role from public.profiles where id = auth.uid()) in ('admin','government','university_admin','faculty'));
drop policy if exists "staff manages impact observations" on public.impact_observations;
create policy "staff manages impact observations" on public.impact_observations for all to authenticated
using ((select role from public.profiles where id = auth.uid()) in ('admin','government','university_admin','faculty'))
with check ((select role from public.profiles where id = auth.uid()) in ('admin','government','university_admin','faculty'));
