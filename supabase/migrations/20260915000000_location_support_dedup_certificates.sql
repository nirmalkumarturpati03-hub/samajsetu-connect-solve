-- Location, support, duplicate-review, and participant-certificate extensions.
-- Exact issue coordinates are kept on the report; the challenge uses them only for matching.
alter table public.reports
  add column if not exists problem_address text,
  add column if not exists location_source text check (location_source in ('gps', 'manual')),
  add column if not exists location_confirmed boolean not null default false,
  add column if not exists voice_transcript text;

alter table public.organization_accounts
  add column if not exists registered_address text,
  add column if not exists service_area text,
  add column if not exists working_districts text[] not null default '{}',
  add column if not exists verified_at timestamptz;

-- Configurable, progressively wider search bands. The allocator can use these values
-- without hard-coding a location policy in a browser.
create table if not exists public.task_assignment_radii (
  radius_km numeric(8,2) primary key check (radius_km > 0),
  sort_order smallint unique not null check (sort_order > 0),
  label text not null,
  is_district_fallback boolean not null default false
);
insert into public.task_assignment_radii(radius_km, sort_order, label, is_district_fallback)
values (5, 1, 'Nearby: 5 km', false), (10, 2, 'Expanded: 10 km', false),
       (25, 3, 'Extended: 25 km', false), (9999, 4, 'District-wide fallback', true)
on conflict (radius_km) do nothing;

create table if not exists public.support_information (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  support_type text not null check (support_type in ('government_scheme','government_assistance','csr_funding','ngo_program','department','emergency_resource')),
  categories text[] not null default '{}',
  districts text[] not null default '{}',
  required_resources text[] not null default '{}',
  assistance_type text,
  eligibility text,
  required_documents text,
  official_url text,
  contact_information text,
  verification_status text not null default 'pending' check (verification_status in ('pending','verified')),
  created_by uuid references public.profiles(id),
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.report_duplicate_reviews (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports(id) on delete cascade,
  similar_challenge_id uuid not null references public.challenges(id) on delete cascade,
  text_similarity numeric(5,2) not null default 0,
  location_similarity numeric(5,2) not null default 0,
  category_match numeric(5,2) not null default 0,
  duplicate_score numeric(5,2) not null default 0,
  decision text not null default 'possible' check (decision in ('possible','separate','merged')),
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  unique(report_id, similar_challenge_id)
);

create table if not exists public.certificate_records (
  id uuid primary key default gen_random_uuid(),
  certificate_number text unique not null default ('SS-' || upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 12))),
  assignment_id uuid not null references public.problem_assignments(id) on delete cascade,
  participant_id uuid not null references public.volunteers(id) on delete restrict,
  work_performed text not null,
  completion_date date not null,
  issued_at timestamptz not null default now(),
  verified_by uuid references public.profiles(id),
  unique(assignment_id, participant_id)
);

alter table public.task_assignment_radii enable row level security;
alter table public.support_information enable row level security;
alter table public.report_duplicate_reviews enable row level security;
alter table public.certificate_records enable row level security;
create policy "radii are readable" on public.task_assignment_radii for select using (true);
create policy "verified support is public" on public.support_information for select using (verification_status = 'verified' or (select role from public.profiles where id = auth.uid()) = 'admin');
create policy "admins manage support" on public.support_information for all to authenticated using ((select role from public.profiles where id = auth.uid()) = 'admin') with check ((select role from public.profiles where id = auth.uid()) = 'admin');
create policy "admin reviews duplicates" on public.report_duplicate_reviews for all to authenticated using ((select role from public.profiles where id = auth.uid()) = 'admin') with check ((select role from public.profiles where id = auth.uid()) = 'admin');
create policy "participant certificates readable" on public.certificate_records for select to authenticated using (exists (select 1 from public.volunteers v join public.organization_accounts o on o.id = v.organization_id where v.id = participant_id and o.owner_id = auth.uid()) or (select role from public.profiles where id = auth.uid()) = 'admin');
create policy "partner creates verified certificates" on public.certificate_records for insert to authenticated with check (exists (select 1 from public.problem_assignments a join public.organization_accounts o on o.id = a.organization_id where a.id = assignment_id and o.owner_id = auth.uid() and a.status in ('completed','verified')));

-- Lightweight TF-IDF-style token overlap plus category and Haversine location signals.
-- It intentionally only flags candidates; no reports are merged automatically.
create or replace function public.find_possible_duplicates(problem_title text, problem_description text, problem_domain text, problem_lat numeric, problem_lng numeric)
returns table(challenge_id uuid, public_id text, title text, domain text, text_similarity numeric, location_similarity numeric, category_match numeric, duplicate_score numeric)
language sql stable security invoker set search_path = public as $$
  with input_tokens as (select distinct lower(word) word from regexp_split_to_table(problem_title || ' ' || problem_description, '\s+') word where length(word) > 2),
  candidates as (
    select c.*, coalesce((select count(*) from input_tokens i where lower(c.title || ' ' || c.summary) like '%' || i.word || '%'), 0)::numeric / greatest(1, (select count(*) from input_tokens)) as text_score,
      public.haversine_km(problem_lat, problem_lng, c.public_latitude, c.public_longitude) as km
    from public.challenges c
  ), scored as (
    select id, public_id, title, domain, created_at,
      round(text_score * 100, 2) as text_similarity,
      round(case when km is null then 0 else greatest(0, 100 - least(100, km * 10)) end, 2) as location_similarity,
      (case when lower(domain) = lower(problem_domain) then 100 else 0 end)::numeric as category_match,
      round(text_score * 50 + (case when km is null then 0 else greatest(0, 100 - least(100, km * 10)) end) * .30 + (case when lower(domain) = lower(problem_domain) then 20 else 0 end), 2) as duplicate_score
    from candidates
    where text_score > 0 or lower(domain) = lower(problem_domain)
  )
  select id, public_id, title, domain, text_similarity, location_similarity, category_match, duplicate_score
  from scored
  order by scored.duplicate_score desc, scored.created_at desc limit 5;
$$;
grant execute on function public.find_possible_duplicates(text,text,text,numeric,numeric) to authenticated;
