-- Complete collaboration-layer entities. No seed/demo records are created.
create table public.problem_dna (
  challenge_id uuid primary key references public.challenges(id) on delete cascade,
  problem_type text, duration_text text, infrastructure text[] not null default '{}',
  intervention_areas text[] not null default '{}', sdgs text[] not null default '{}',
  possible_causes jsonb not null default '[]', confidence numeric(3,2),
  generated_at timestamptz not null default now(), verified_at timestamptz
);
create table public.match_recommendations (
  id uuid primary key default gen_random_uuid(), challenge_id uuid not null references public.challenges(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete cascade, profile_id uuid references public.profiles(id) on delete cascade,
  match_kind text not null check (match_kind in ('university','faculty','student','industry','csr','research')),
  score smallint not null check(score between 0 and 100), reasons jsonb not null default '[]',
  status text not null default 'suggested' check(status in ('suggested','interested','accepted','declined')), created_at timestamptz not null default now(),
  check (organization_id is not null or profile_id is not null)
);
create table public.project_members (
  project_id uuid not null references public.projects(id) on delete cascade, profile_id uuid not null references public.profiles(id) on delete cascade,
  role text not null, status text not null default 'invited' check(status in ('invited','active','declined')), primary key(project_id,profile_id)
);
create table public.project_comments (
  id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id) on delete cascade,
  author_id uuid references public.profiles(id) on delete set null, body text not null check(char_length(body) between 1 and 5000), created_at timestamptz not null default now()
);
create table public.prototypes (
  id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id) on delete cascade,
  version text not null, description text, repository_url text, evidence_path text, created_by uuid references public.profiles(id), created_at timestamptz not null default now(), unique(project_id,version)
);
create table public.pilots (
  id uuid primary key default gen_random_uuid(), project_id uuid unique not null references public.projects(id) on delete cascade,
  location_text text not null, starts_on date, ends_on date, target_population integer, baseline text, target text, observed_result text,
  status text not null default 'planned' check(status in ('planned','approved','running','completed','verified')), government_verified_at timestamptz
);
create table public.community_feedback (
  id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id) on delete cascade,
  author_id uuid references public.profiles(id) on delete set null, verdict text not null check(verdict in ('solved','partially_solved','not_solved')),
  comment text, evidence_path text, created_at timestamptz not null default now()
);
create table public.funding_commitments (
  id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete set null, amount numeric(14,2) check(amount >= 0),
  status text not null default 'interest' check(status in ('interest','committed','approved','received')), source_type text not null, created_at timestamptz not null default now()
);
create table public.ip_assets (
  id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id) on delete cascade,
  title text not null, asset_type text not null check(asset_type in ('patent','copyright','design','open_source','trade_secret','other')),
  owner text, contributors text[] not null default '{}', status text not null default 'draft', recorded_on date
);
create table public.notifications (
  id uuid primary key default gen_random_uuid(), recipient_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null, title text not null, body text, entity_type text, entity_id uuid, read_at timestamptz, created_at timestamptz not null default now()
);
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(), actor_id uuid references public.profiles(id) on delete set null,
  action text not null, entity_type text not null, entity_id uuid, metadata jsonb not null default '{}', created_at timestamptz not null default now()
);
alter table public.problem_dna enable row level security; alter table public.match_recommendations enable row level security;
alter table public.project_members enable row level security; alter table public.project_comments enable row level security;
alter table public.prototypes enable row level security; alter table public.pilots enable row level security;
alter table public.community_feedback enable row level security; alter table public.funding_commitments enable row level security;
alter table public.ip_assets enable row level security; alter table public.notifications enable row level security; alter table public.audit_logs enable row level security;
create policy "public dna read" on public.problem_dna for select using (true); create policy "public matches read" on public.match_recommendations for select using (true);
create policy "project members read" on public.project_members for select using (true); create policy "comments read" on public.project_comments for select using (true);
create policy "prototypes read" on public.prototypes for select using (true); create policy "pilots read" on public.pilots for select using (true);
create policy "feedback read" on public.community_feedback for select using (true); create policy "funding read" on public.funding_commitments for select using (true); create policy "ip read" on public.ip_assets for select using (true);
create policy "recipient notifications" on public.notifications for select to authenticated using(recipient_id=auth.uid());
create policy "own comments" on public.project_comments for insert to authenticated with check(author_id=auth.uid());
create policy "own feedback" on public.community_feedback for insert to authenticated with check(author_id=auth.uid());
create policy "staff collaboration writes" on public.project_members for all to authenticated using((select role from public.profiles where id=auth.uid()) in ('admin','government','university_admin','faculty')) with check((select role from public.profiles where id=auth.uid()) in ('admin','government','university_admin','faculty'));
create policy "staff dna writes" on public.problem_dna for all to authenticated using((select role from public.profiles where id=auth.uid()) in ('admin','government','university_admin','faculty')) with check((select role from public.profiles where id=auth.uid()) in ('admin','government','university_admin','faculty'));
create policy "staff match writes" on public.match_recommendations for all to authenticated using((select role from public.profiles where id=auth.uid()) in ('admin','government','university_admin','faculty')) with check((select role from public.profiles where id=auth.uid()) in ('admin','government','university_admin','faculty'));
-- projects and milestones were already registered in the initial migration.
alter publication supabase_realtime add table public.problem_dna, public.match_recommendations, public.project_comments, public.prototypes, public.pilots, public.community_feedback, public.notifications;
