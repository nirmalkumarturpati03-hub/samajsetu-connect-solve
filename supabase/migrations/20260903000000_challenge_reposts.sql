-- One citizen confirmation/repost per challenge. This prevents duplicate challenge cards
-- while preserving the strength of community corroboration.
create table public.challenge_supports (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.challenges(id) on delete cascade,
  supporter_id uuid not null references public.profiles(id) on delete cascade,
  note text check(char_length(note) <= 1000),
  created_at timestamptz not null default now(),
  unique(challenge_id, supporter_id)
);
create index challenge_supports_challenge_idx on public.challenge_supports(challenge_id, created_at desc);
alter table public.challenge_supports enable row level security;
create policy "support totals discoverable" on public.challenge_supports for select using (true);
create policy "authenticated citizen support" on public.challenge_supports for insert to authenticated with check(supporter_id = auth.uid());
create policy "supporter removes own support" on public.challenge_supports for delete to authenticated using(supporter_id = auth.uid());

-- Reposts increase the same priority signal as corroborating reports, without
-- creating duplicate challenge records.
create or replace function public.refresh_challenge_priority(challenge_uuid uuid) returns void language plpgsql security definer set search_path = public as $$
declare c public.challenges; direct_report_count int; support_count int; community_count int; score int; reasons jsonb;
begin
  select * into c from public.challenges where id = challenge_uuid for update;
  select count(*) into direct_report_count from public.reports where challenge_id = challenge_uuid;
  select count(*) into support_count from public.challenge_supports where challenge_id = challenge_uuid;
  community_count := direct_report_count + support_count;
  score := least(100, greatest(0, c.severity * 10 + c.urgency * 8 + least(20, coalesce(c.affected_population,0) / 25) + c.evidence_quality * 4 + least(12, community_count * 3) + case when c.domain in ('Water','Healthcare','Education') then 10 else 4 end + cardinality(c.vulnerable_groups) * 3));
  reasons := jsonb_build_array(
    jsonb_build_object('factor','severity','value',c.severity), jsonb_build_object('factor','urgency','value',c.urgency),
    jsonb_build_object('factor','community_support','value',community_count), jsonb_build_object('factor','evidence_quality','value',c.evidence_quality));
  update public.challenges set priority_score = score, priority_reasons = reasons where id = challenge_uuid;
end; $$;

create or replace function public.on_support_changed() returns trigger language plpgsql security definer set search_path = public as $$
begin perform public.refresh_challenge_priority(coalesce(new.challenge_id, old.challenge_id)); return coalesce(new, old); end; $$;
create trigger support_priority after insert or delete on public.challenge_supports for each row execute procedure public.on_support_changed();

-- Replace explorer RPC with a safe aggregate count: direct reports + citizen confirmations.
create or replace function public.search_challenges(search_text text default '', district_filter text default null, domain_filter text default null) returns table (
  id uuid, public_id text, title text, domain text, district text, priority_score smallint, verification public.verification_status, stage public.project_stage, affected_population integer, reports bigint, created_at timestamptz
) language sql stable security invoker set search_path = public as $$
  select c.id,c.public_id,c.title,c.domain,c.district,c.priority_score,c.verification,c.stage,c.affected_population,
    coalesce((select count(*) from public.reports r where r.challenge_id=c.id),0) + coalesce((select count(*) from public.challenge_supports s where s.challenge_id=c.id),0),c.created_at
  from public.challenges c
  where (search_text='' or c.title ilike '%' || search_text || '%' or c.domain ilike '%' || search_text || '%')
    and (district_filter is null or c.district=district_filter) and (domain_filter is null or c.domain=domain_filter)
  order by c.priority_score desc,c.created_at desc;
$$;
alter publication supabase_realtime add table public.challenge_supports;
