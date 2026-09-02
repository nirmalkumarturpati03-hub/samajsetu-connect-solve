-- Organization, volunteer, assignment, evidence, review, and re-routing workflow.
create type public.task_status as enum ('pending', 'in_progress', 'completed', 'review_changes_requested', 'verified', 'unable_to_resolve');

create table public.organization_accounts (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null, organization_type text not null, contact_name text, contact_email text, contact_phone text,
  district text, locality text, latitude numeric(9,6), longitude numeric(9,6), expertise text[] not null default '{}', capabilities text[] not null default '{}', created_at timestamptz not null default now(), unique(owner_id)
);
create table public.volunteers (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organization_accounts(id) on delete cascade,
  name text not null, photo_url text, department text, skills text[] not null default '{}', experience text, availability text, contact_details text, created_at timestamptz not null default now()
);
create table public.problem_assignments (
  id uuid primary key default gen_random_uuid(), challenge_id uuid not null references public.challenges(id) on delete cascade,
  organization_id uuid not null references public.organization_accounts(id), assigned_by uuid references public.profiles(id), status public.task_status not null default 'pending', unable_reason text, created_at timestamptz not null default now(), accepted_at timestamptz, resolved_at timestamptz
);
create table public.problem_tasks (
  id uuid primary key default gen_random_uuid(), assignment_id uuid not null references public.problem_assignments(id) on delete cascade,
  volunteer_id uuid references public.volunteers(id) on delete set null, description text not null, deadline date, status public.task_status not null default 'pending', completion_note text, reviewed_by uuid references public.profiles(id), reviewed_at timestamptz, created_at timestamptz not null default now()
);
create table public.task_evidence (
  id uuid primary key default gen_random_uuid(), task_id uuid not null references public.problem_tasks(id) on delete cascade, storage_path text not null, mime_type text not null, note text, created_at timestamptz not null default now()
);
create table public.problem_transfers (
  id uuid primary key default gen_random_uuid(), assignment_id uuid not null references public.problem_assignments(id) on delete cascade, to_organization_id uuid not null references public.organization_accounts(id), reason text not null, created_at timestamptz not null default now()
);

alter table public.organization_accounts enable row level security; alter table public.volunteers enable row level security; alter table public.problem_assignments enable row level security; alter table public.problem_tasks enable row level security; alter table public.task_evidence enable row level security; alter table public.problem_transfers enable row level security;
create policy "organization owner manages account" on public.organization_accounts for all to authenticated using(owner_id=auth.uid()) with check(owner_id=auth.uid());
create policy "organization owner manages volunteers" on public.volunteers for all to authenticated using(exists(select 1 from public.organization_accounts o where o.id=organization_id and o.owner_id=auth.uid())) with check(exists(select 1 from public.organization_accounts o where o.id=organization_id and o.owner_id=auth.uid()));
create policy "organization owner manages assignments" on public.problem_assignments for all to authenticated using(exists(select 1 from public.organization_accounts o where o.id=organization_id and o.owner_id=auth.uid())) with check(exists(select 1 from public.organization_accounts o where o.id=organization_id and o.owner_id=auth.uid()));
create policy "organization owner manages tasks" on public.problem_tasks for all to authenticated using(exists(select 1 from public.problem_assignments a join public.organization_accounts o on o.id=a.organization_id where a.id=assignment_id and o.owner_id=auth.uid())) with check(exists(select 1 from public.problem_assignments a join public.organization_accounts o on o.id=a.organization_id where a.id=assignment_id and o.owner_id=auth.uid()));
create policy "organization owner manages task evidence" on public.task_evidence for all to authenticated using(exists(select 1 from public.problem_tasks t join public.problem_assignments a on a.id=t.assignment_id join public.organization_accounts o on o.id=a.organization_id where t.id=task_id and o.owner_id=auth.uid())) with check(exists(select 1 from public.problem_tasks t join public.problem_assignments a on a.id=t.assignment_id join public.organization_accounts o on o.id=a.organization_id where t.id=task_id and o.owner_id=auth.uid()));
create policy "organization owner creates transfers" on public.problem_transfers for all to authenticated using(exists(select 1 from public.problem_assignments a join public.organization_accounts o on o.id=a.organization_id where a.id=assignment_id and o.owner_id=auth.uid())) with check(exists(select 1 from public.problem_assignments a join public.organization_accounts o on o.id=a.organization_id where a.id=assignment_id and o.owner_id=auth.uid()));
