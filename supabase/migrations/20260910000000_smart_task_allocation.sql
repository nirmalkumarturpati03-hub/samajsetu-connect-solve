-- Explainable, location-aware allocation and automatic reassignment.
-- The decision is made in the database so a task can never be routed randomly by a client.

create table public.task_allocation_settings (
  id boolean primary key default true check (id),
  expertise_weight numeric(5,2) not null default 30 check (expertise_weight >= 0),
  resource_weight numeric(5,2) not null default 20 check (resource_weight >= 0),
  availability_weight numeric(5,2) not null default 15 check (availability_weight >= 0),
  distance_weight numeric(5,2) not null default 15 check (distance_weight >= 0),
  performance_weight numeric(5,2) not null default 10 check (performance_weight >= 0),
  workload_weight numeric(5,2) not null default 10 check (workload_weight >= 0),
  updated_at timestamptz not null default now(),
  check (expertise_weight + resource_weight + availability_weight + distance_weight + performance_weight + workload_weight > 0)
);
insert into public.task_allocation_settings (id) values (true) on conflict (id) do nothing;

alter table public.organization_accounts
  add column if not exists workload_limit integer not null default 10 check (workload_limit > 0);

alter table public.challenges
  add column if not exists required_resources text[] not null default '{}';

alter table public.problem_assignments
  add column if not exists suitability_score numeric(6,2),
  add column if not exists allocation_rank integer,
  add column if not exists distance_km numeric(8,2),
  add column if not exists assigned_by_algorithm boolean not null default false;

create table public.task_allocation_rankings (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.challenges(id) on delete cascade,
  organization_id uuid not null references public.organization_accounts(id) on delete cascade,
  allocation_rank integer not null check (allocation_rank > 0),
  suitability_score numeric(6,2) not null,
  distance_km numeric(8,2),
  expertise_score numeric(5,2) not null,
  resource_score numeric(5,2) not null,
  availability_score numeric(5,2) not null,
  performance_score numeric(5,2) not null,
  workload_score numeric(5,2) not null,
  is_selected boolean not null default false,
  excluded_organization_ids uuid[] not null default '{}',
  created_at timestamptz not null default now()
);
create index task_allocation_rankings_challenge_idx on public.task_allocation_rankings (challenge_id, created_at desc);
create index problem_assignments_active_challenge_idx on public.problem_assignments (challenge_id) where status not in ('completed', 'verified', 'unable_to_resolve');

create or replace function public.haversine_km(lat1 numeric, lon1 numeric, lat2 numeric, lon2 numeric)
returns numeric language sql immutable parallel safe as $$
  select case when lat1 is null or lon1 is null or lat2 is null or lon2 is null then null else
    6371.0 * 2 * asin(sqrt(
      power(sin(radians((lat2-lat1)/2)), 2) + cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians((lon2-lon1)/2)), 2)
    )) end;
$$;

create or replace function public.allocate_smart_task(task_challenge_id uuid, excluded_ids uuid[] default '{}')
returns uuid language plpgsql security definer set search_path = public as $$
declare
  selected_assignment uuid;
  previous_assignment uuid;
  selected_organization uuid;
  settings public.task_allocation_settings;
begin
  -- Serialise per task and leave an existing live assignment untouched.
  perform 1 from public.challenges where id = task_challenge_id for update;
  select id into selected_assignment from public.problem_assignments
    where challenge_id = task_challenge_id and status not in ('completed', 'verified', 'unable_to_resolve')
    order by created_at desc limit 1;
  if selected_assignment is not null then return selected_assignment; end if;

  select * into settings from public.task_allocation_settings where id = true;
  with challenge_data as (
    select c.id, c.public_latitude as latitude, c.public_longitude as longitude,
      c.required_skills, c.required_resources
    from public.challenges c where c.id = task_challenge_id
  ), candidate_base as (
    select o.id as organization_id, o.latitude, o.longitude, o.expertise, o.capabilities,
      o.workload_limit, c.latitude as task_latitude, c.longitude as task_longitude,
      c.required_skills, c.required_resources,
      (select count(*) from public.volunteers v where v.organization_id = o.id
       and coalesce(lower(v.availability), 'available') not in ('unavailable','busy','inactive','off')) as available_people,
      (select count(*) from public.volunteers v where v.organization_id = o.id
       and coalesce(lower(v.availability), 'available') not in ('unavailable','busy','inactive','off')
       and (cardinality(c.required_skills) = 0 or v.skills && c.required_skills)) as skilled_people,
      (select count(*) from public.problem_assignments a where a.organization_id = o.id
       and a.status not in ('completed','verified','unable_to_resolve')) as active_workload,
      (select count(*) from public.problem_assignments a where a.organization_id = o.id) as total_assigned,
      (select count(*) from public.problem_assignments a where a.organization_id = o.id
       and a.status in ('completed','verified')) as total_solved
    from public.organization_accounts o cross join challenge_data c
    where coalesce(o.account_status, 'Active') = 'Active' and not (o.id = any(coalesce(excluded_ids, '{}')))
  ), eligible as (
    select *, public.haversine_km(task_latitude, task_longitude, latitude, longitude) as distance_km,
      case when cardinality(required_skills) = 0 then 100
        when expertise && required_skills then 100 when skilled_people > 0 then 75 else 0 end as expertise_score,
      case when cardinality(required_resources) = 0 then 100
        when capabilities && required_resources then 100 else 0 end as resource_score,
      case when cardinality(required_skills) = 0 then least(100, skilled_people * 100)
        else least(100, skilled_people * 100 / greatest(1, cardinality(required_skills))) end as availability_score,
      case when total_assigned = 0 then 50 else total_solved::numeric * 100 / total_assigned end as performance_score,
      greatest(0, 100 - active_workload::numeric * 100 / workload_limit) as workload_score
    from candidate_base
    where active_workload < workload_limit
      and (cardinality(required_skills) = 0 or expertise && required_skills or skilled_people > 0)
      and (cardinality(required_resources) = 0 or capabilities && required_resources)
      and (cardinality(required_skills) = 0 or skilled_people > 0)
  ), ranked as (
    select *, case when distance_km is null then 50 else greatest(0, 100 - least(100, distance_km)) end as distance_score
    from eligible
  ), scored as (
    select *, round((expertise_score * settings.expertise_weight + resource_score * settings.resource_weight +
      availability_score * settings.availability_weight + distance_score * settings.distance_weight +
      performance_score * settings.performance_weight + workload_score * settings.workload_weight) /
      (settings.expertise_weight + settings.resource_weight + settings.availability_weight + settings.distance_weight + settings.performance_weight + settings.workload_weight), 2) as suitability_score
    from ranked
  ), inserted_rankings as (
    insert into public.task_allocation_rankings (challenge_id, organization_id, allocation_rank, suitability_score, distance_km,
      expertise_score, resource_score, availability_score, performance_score, workload_score, is_selected, excluded_organization_ids)
    select task_challenge_id, organization_id,
      row_number() over (order by suitability_score desc, distance_km nulls last, organization_id)::integer,
      suitability_score, round(distance_km, 2), expertise_score, resource_score, availability_score, performance_score, workload_score,
      row_number() over (order by suitability_score desc, distance_km nulls last, organization_id) = 1, coalesce(excluded_ids, '{}')
    from scored
    returning organization_id, allocation_rank, suitability_score, distance_km
  )
  select organization_id into selected_organization from inserted_rankings where allocation_rank = 1;

  if selected_organization is null then return null; end if;
  insert into public.problem_assignments (challenge_id, organization_id, status, suitability_score, allocation_rank, distance_km, assigned_by_algorithm)
  select task_challenge_id, r.organization_id, 'pending', r.suitability_score, r.allocation_rank, r.distance_km, true
  from public.task_allocation_rankings r
  where r.challenge_id = task_challenge_id and r.organization_id = selected_organization
  order by r.created_at desc limit 1 returning id into selected_assignment;
  update public.challenges set stage = 'matched' where id = task_challenge_id and stage = 'reported';
  return selected_assignment;
end;
$$;

create or replace function public.on_challenge_received_allocate() returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.allocate_smart_task(new.id);
  return new;
end;
$$;
drop trigger if exists challenge_smart_allocation on public.challenges;
create trigger challenge_smart_allocation after insert on public.challenges for each row execute procedure public.on_challenge_received_allocate();

create or replace function public.on_assignment_unable_reassign() returns trigger language plpgsql security definer set search_path = public as $$
declare new_assignment uuid; excluded uuid[];
begin
  if new.status <> 'unable_to_resolve' or old.status = 'unable_to_resolve' then return new; end if;
  select array_agg(distinct organization_id) into excluded from public.problem_assignments where challenge_id = new.challenge_id;
  new_assignment := public.allocate_smart_task(new.challenge_id, coalesce(excluded, '{}'));
  if new_assignment is not null then
    insert into public.problem_transfers (assignment_id, to_organization_id, reason)
    select new.id, organization_id, coalesce(new.unable_reason, 'Unable to resolve') from public.problem_assignments where id = new_assignment;
  end if;
  return new;
end;
$$;
drop trigger if exists assignment_smart_reassignment on public.problem_assignments;
create trigger assignment_smart_reassignment after update of status on public.problem_assignments for each row execute procedure public.on_assignment_unable_reassign();

alter table public.task_allocation_settings enable row level security;
alter table public.task_allocation_rankings enable row level security;
create policy "admins manage allocation settings" on public.task_allocation_settings for all to authenticated
  using ((select role from public.profiles where id = auth.uid()) = 'admin') with check ((select role from public.profiles where id = auth.uid()) = 'admin');
create policy "admins read allocation rankings" on public.task_allocation_rankings for select to authenticated
  using ((select role from public.profiles where id = auth.uid()) = 'admin');
create policy "partner reads own allocation rankings" on public.task_allocation_rankings for select to authenticated
  using (exists (select 1 from public.organization_accounts o where o.id = organization_id and o.owner_id = auth.uid()));

grant execute on function public.haversine_km(numeric, numeric, numeric, numeric) to authenticated;
-- Allocation is invoked only by database triggers; clients cannot route another partner's task.
revoke execute on function public.allocate_smart_task(uuid, uuid[]) from public, authenticated;
