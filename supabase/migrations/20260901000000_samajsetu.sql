-- SamajSetu production MVP schema. No synthetic records or seed data are included.
create extension if not exists pgcrypto;
create extension if not exists vector;

create type public.app_role as enum ('citizen','government','university_admin','faculty','student','industry','csr','research','admin');
create type public.verification_status as enum ('unverified','under_review','community_verified','officially_verified');
create type public.project_stage as enum ('reported','validated','matched','project','prototype','pilot','impact');
create type public.milestone_status as enum ('not_started','in_progress','completed','delayed','blocked');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  role public.app_role not null default 'citizen',
  district text,
  created_at timestamptz not null default now()
);

create table public.challenges (
  id uuid primary key default gen_random_uuid(),
  public_id text unique not null default ('JH-' || upper(substr(encode(gen_random_bytes(4), 'hex'), 1, 8))),
  title text not null,
  summary text not null,
  domain text not null,
  subdomain text,
  district text not null,
  block text,
  locality text,
  -- public coordinates are deliberately rounded; exact evidence locations stay private.
  public_latitude numeric(8,5),
  public_longitude numeric(8,5),
  severity smallint not null check (severity between 1 and 4),
  urgency smallint not null check (urgency between 1 and 4),
  affected_population integer,
  vulnerable_groups text[] not null default '{}',
  required_skills text[] not null default '{}',
  evidence_quality smallint not null default 1 check (evidence_quality between 1 and 3),
  priority_score smallint not null default 0 check (priority_score between 0 and 100),
  priority_reasons jsonb not null default '[]',
  verification public.verification_status not null default 'unverified',
  stage public.project_stage not null default 'reported',
  embedding vector(384),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid references public.challenges(id) on delete set null,
  reporter_id uuid references public.profiles(id) on delete set null,
  description text not null check (char_length(description) between 10 and 5000),
  district text not null,
  block text,
  locality text,
  latitude numeric(9,6),
  longitude numeric(9,6),
  consent_to_contact boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.evidence (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports(id) on delete cascade,
  storage_path text not null,
  mime_type text not null check (mime_type in ('image/jpeg','image/png','image/webp','video/mp4','audio/webm','audio/mpeg','application/pdf')),
  size_bytes integer not null check (size_bytes > 0 and size_bytes <= 26214400),
  created_at timestamptz not null default now()
);

create table public.verification_events (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.challenges(id) on delete cascade,
  actor_id uuid references public.profiles(id),
  status public.verification_status not null,
  method text not null,
  note text,
  created_at timestamptz not null default now()
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind public.app_role not null check (kind in ('university_admin','industry','csr','research')),
  district text,
  capabilities text[] not null default '{}',
  capacity smallint not null default 1 check (capacity between 1 and 3),
  created_at timestamptz not null default now()
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid unique not null references public.challenges(id) on delete restrict,
  title text not null,
  objective text not null,
  expected_outcome text,
  health_score smallint not null default 0 check (health_score between 0 and 100),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.milestones (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  owner_id uuid references public.profiles(id),
  due_date date,
  status public.milestone_status not null default 'not_started',
  evidence_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.impact_observations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  metric text not null,
  unit text not null,
  baseline numeric,
  target numeric,
  observed numeric,
  source text not null,
  verification_status public.verification_status not null default 'unverified',
  created_at timestamptz not null default now()
);

create index challenges_discovery_idx on public.challenges (district, domain, priority_score desc, created_at desc);
create index challenges_embedding_idx on public.challenges using ivfflat (embedding vector_cosine_ops) with (lists = 100);
create index reports_challenge_idx on public.reports (challenge_id, created_at desc);
create index milestones_project_idx on public.milestones (project_id, due_date);

create or replace function public.touch_updated_at() returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end; $$;
create trigger challenges_updated before update on public.challenges for each row execute procedure public.touch_updated_at();
create trigger projects_updated before update on public.projects for each row execute procedure public.touch_updated_at();
create trigger milestones_updated before update on public.milestones for each row execute procedure public.touch_updated_at();

create or replace function public.create_profile_for_user() returns trigger language plpgsql security definer set search_path = public as $$
begin insert into public.profiles (id, display_name) values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', 'Community member')); return new; end; $$;
create trigger auth_user_profile after insert on auth.users for each row execute procedure public.create_profile_for_user();

-- Explainable priority calculation. AI/embedding results are inputs only; verification remains human-led.
create or replace function public.refresh_challenge_priority(challenge_uuid uuid) returns void language plpgsql security definer set search_path = public as $$
declare c public.challenges; report_count int; score int; reasons jsonb;
begin
  select * into c from public.challenges where id = challenge_uuid for update;
  select count(*) into report_count from public.reports where challenge_id = challenge_uuid;
  score := least(100, greatest(0, c.severity * 10 + c.urgency * 8 + least(20, coalesce(c.affected_population,0) / 25) + c.evidence_quality * 4 + least(12, report_count * 3) + case when c.domain in ('Water','Healthcare','Education') then 10 else 4 end + cardinality(c.vulnerable_groups) * 3));
  reasons := jsonb_build_array(
    jsonb_build_object('factor','severity','value',c.severity), jsonb_build_object('factor','urgency','value',c.urgency),
    jsonb_build_object('factor','supporting_reports','value',report_count), jsonb_build_object('factor','evidence_quality','value',c.evidence_quality));
  update public.challenges set priority_score = score, priority_reasons = reasons where id = challenge_uuid;
end; $$;

create or replace function public.on_report_changed() returns trigger language plpgsql security definer set search_path = public as $$
begin if new.challenge_id is not null then perform public.refresh_challenge_priority(new.challenge_id); end if; return new; end; $$;
create trigger report_priority after insert or update of challenge_id on public.reports for each row execute procedure public.on_report_changed();

-- RPC used by the public explorer. Exact locations and private report text are never returned.
create or replace function public.search_challenges(search_text text default '', district_filter text default null, domain_filter text default null) returns table (
  id uuid, public_id text, title text, domain text, district text, priority_score smallint, verification public.verification_status, stage public.project_stage, affected_population integer, reports bigint, created_at timestamptz
) language sql stable security invoker set search_path = public as $$
  select c.id,c.public_id,c.title,c.domain,c.district,c.priority_score,c.verification,c.stage,c.affected_population,count(r.id),c.created_at
  from public.challenges c left join public.reports r on r.challenge_id=c.id
  where (search_text='' or c.title ilike '%' || search_text || '%' or c.domain ilike '%' || search_text || '%')
    and (district_filter is null or c.district=district_filter) and (domain_filter is null or c.domain=domain_filter)
  group by c.id order by c.priority_score desc,c.created_at desc;
$$;

alter table public.profiles enable row level security;
alter table public.challenges enable row level security;
alter table public.reports enable row level security;
alter table public.evidence enable row level security;
alter table public.verification_events enable row level security;
alter table public.organizations enable row level security;
alter table public.projects enable row level security;
alter table public.milestones enable row level security;
alter table public.impact_observations enable row level security;

create policy "profiles readable" on public.profiles for select to authenticated using (true);
create policy "profile owner update" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "public challenge discovery" on public.challenges for select using (true);
create policy "authenticated create challenges" on public.challenges for insert to authenticated with check (created_by = auth.uid());
create policy "staff update challenges" on public.challenges for update to authenticated using ((select role from public.profiles where id=auth.uid()) in ('government','admin','university_admin'));
create policy "own report read" on public.reports for select to authenticated using (reporter_id = auth.uid() or (select role from public.profiles where id=auth.uid()) in ('government','admin','university_admin'));
create policy "authenticated report" on public.reports for insert to authenticated with check (reporter_id = auth.uid());
create policy "evidence access" on public.evidence for select to authenticated using (exists (select 1 from public.reports r where r.id=report_id and (r.reporter_id=auth.uid() or (select role from public.profiles where id=auth.uid()) in ('government','admin','university_admin'))));
create policy "evidence owner insert" on public.evidence for insert to authenticated with check (exists (select 1 from public.reports r where r.id=report_id and r.reporter_id=auth.uid()));
create policy "organization discovery" on public.organizations for select using (true);
create policy "projects readable" on public.projects for select using (true);
create policy "staff project create" on public.projects for insert to authenticated with check ((select role from public.profiles where id=auth.uid()) in ('government','admin','university_admin','faculty'));
create policy "milestones readable" on public.milestones for select using (true);
create policy "impact readable" on public.impact_observations for select using (true);

-- Realtime publication; clients subscribe to these tables and refetch current server state.
alter publication supabase_realtime add table public.challenges, public.reports, public.projects, public.milestones, public.impact_observations;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values ('evidence','evidence',false,26214400,array['image/jpeg','image/png','image/webp','video/mp4','audio/webm','audio/mpeg','application/pdf']) on conflict (id) do nothing;
create policy "evidence upload owner folder" on storage.objects for insert to authenticated with check (bucket_id='evidence' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "evidence read owner folder" on storage.objects for select to authenticated using (bucket_id='evidence' and (storage.foldername(name))[1] = auth.uid()::text);
