-- Secure civic workflow foundation. This migration is additive and deliberately
-- preserves reports, evidence, assignments, and their existing history.

-- Public challenge coordinates are an approximate discovery aid only. Exact
-- reporter coordinates remain exclusively on public.reports.
create or replace function public.generalize_challenge_public_location()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.public_latitude is not null then new.public_latitude := round(new.public_latitude, 2); end if;
  if new.public_longitude is not null then new.public_longitude := round(new.public_longitude, 2); end if;
  return new;
end;
$$;
drop trigger if exists challenge_public_location_generalization on public.challenges;
create trigger challenge_public_location_generalization
  before insert or update of public_latitude, public_longitude on public.challenges
  for each row execute procedure public.generalize_challenge_public_location();
update public.challenges
set public_latitude = round(public_latitude, 2), public_longitude = round(public_longitude, 2)
where public_latitude is not null or public_longitude is not null;

alter table public.reports
  add column if not exists category text,
  add column if not exists severity smallint check (severity between 1 and 4),
  add column if not exists urgency smallint check (urgency between 1 and 4),
  add column if not exists affected_population integer check (affected_population >= 0),
  add column if not exists consent_location boolean not null default false,
  add column if not exists consent_media boolean not null default false,
  add column if not exists consent_ai_processing boolean not null default false;

-- Original private evidence remains inaccessible to public discovery. Staff can
-- review it only through their authenticated Supabase session (and signed URLs
-- generated from that session); arbitrary storage paths remain protected.
drop policy if exists "staff reviews report evidence" on storage.objects;
create policy "staff reviews report evidence" on storage.objects for select to authenticated
using (
  bucket_id = 'evidence'
  and (select role from public.profiles where id = auth.uid()) in ('admin', 'government', 'university_admin')
  and exists (
    select 1 from public.evidence e
    join public.reports r on r.id = e.report_id
    where e.storage_path = name
  )
);

alter table public.challenges
  add column if not exists merged_into_id uuid references public.challenges(id) on delete restrict,
  add column if not exists duplicate_status text not null default 'master'
    check (duplicate_status in ('master', 'merged', 'possible'));
create index if not exists challenges_merged_into_idx on public.challenges(merged_into_id) where merged_into_id is not null;

alter table public.problem_assignments
  add column if not exists started_at timestamptz,
  add column if not exists completion_note text,
  add column if not exists completed_by uuid references public.profiles(id);
alter table public.problem_tasks
  add column if not exists assigned_at timestamptz,
  add column if not exists started_at timestamptz,
  add column if not exists completed_at timestamptz,
  add column if not exists progress smallint not null default 0 check (progress between 0 and 100);
alter table public.task_evidence
  add column if not exists evidence_kind text not null default 'progress'
    check (evidence_kind in ('before', 'progress', 'after', 'completion')),
  add column if not exists size_bytes integer check (size_bytes > 0 and size_bytes <= 26214400),
  add column if not exists uploaded_by uuid references public.profiles(id);

-- Private task evidence. Paths begin with the authenticated partner owner ID.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('task-evidence', 'task-evidence', false, 26214400,
  array['image/jpeg','image/png','image/webp','video/mp4','video/webm','application/pdf'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
drop policy if exists "partner task evidence upload" on storage.objects;
create policy "partner task evidence upload" on storage.objects for insert to authenticated
with check (
  bucket_id = 'task-evidence' and (storage.foldername(name))[1] = auth.uid()::text
  and exists (
    select 1 from public.problem_tasks t
    join public.problem_assignments a on a.id = t.assignment_id
    join public.organization_accounts o on o.id = a.organization_id
    where t.id::text = (storage.foldername(name))[2] and o.owner_id = auth.uid()
  )
);
drop policy if exists "partner task evidence read" on storage.objects;
create policy "partner task evidence read" on storage.objects for select to authenticated
using (
  bucket_id = 'task-evidence' and (
    (storage.foldername(name))[1] = auth.uid()::text or
    (select role from public.profiles where id = auth.uid()) in ('admin', 'government')
  )
);

-- Public clients must use the safe discovery RPC rather than selecting the
-- challenge table directly. This prevents retrieval of historical exact GPS.
drop policy if exists "public challenge discovery" on public.challenges;
drop policy if exists "challenge creator, reporter, assignee, or staff reads challenge" on public.challenges;
create policy "challenge creator, reporter, assignee, or staff reads challenge" on public.challenges for select to authenticated
using (
  created_by = auth.uid()
  or exists (select 1 from public.reports r where r.challenge_id = challenges.id and r.reporter_id = auth.uid())
  or exists (select 1 from public.problem_assignments a join public.organization_accounts o on o.id = a.organization_id where a.challenge_id = challenges.id and o.owner_id = auth.uid())
  or (select role from public.profiles where id = auth.uid()) in ('admin', 'government', 'university_admin')
);

-- The existing explorer RPC is intentionally security-definer and exposes only
-- generalized public fields. It does not return report text, exact locations,
-- reporter identity, or private evidence paths.
drop function if exists public.search_challenges(text, text, text);
create function public.search_challenges(search_text text default '', district_filter text default null, domain_filter text default null)
returns table (
  id uuid, public_id text, title text, domain text, district text, priority_score smallint,
  verification public.verification_status, stage public.project_stage, affected_population integer,
  reports bigint, reposts bigint, created_at timestamptz, preview_image_path text, media jsonb,
  comments jsonb, public_latitude numeric, public_longitude numeric
) language sql stable security definer set search_path = public as $$
  select c.id, c.public_id, c.title, c.domain, c.district, c.priority_score, c.verification, c.stage,
    c.affected_population,
    coalesce((select count(*) from public.reports r where r.challenge_id = c.id), 0),
    coalesce((select count(*) from public.challenge_supports s where s.challenge_id = c.id), 0),
    c.created_at, c.preview_image_path,
    coalesce((select jsonb_agg(jsonb_build_object('path', cm.storage_path, 'type', cm.mime_type) order by cm.created_at)
      from public.challenge_media cm where cm.challenge_id = c.id), '[]'::jsonb),
    coalesce((select jsonb_agg(jsonb_build_object('id', s.id, 'note', s.note, 'created_at', s.created_at) order by s.created_at desc)
      from public.challenge_supports s where s.challenge_id = c.id and s.note is not null and btrim(s.note) <> ''), '[]'::jsonb),
    c.public_latitude, c.public_longitude
  from public.challenges c
  where c.merged_into_id is null
    and (search_text = '' or c.title ilike '%' || search_text || '%' or c.domain ilike '%' || search_text || '%')
    and (district_filter is null or c.district = district_filter)
    and (domain_filter is null or c.domain = domain_filter)
  order by c.priority_score desc, c.created_at desc;
$$;
revoke all on function public.search_challenges(text, text, text) from public;
grant execute on function public.search_challenges(text, text, text) to anon, authenticated;

-- Authorised verification persists the decision, history, and an immutable audit row.
create or replace function public.review_challenge(
  challenge_uuid uuid, next_status public.verification_status, review_method text, review_note text default null
) returns void language plpgsql security definer set search_path = public as $$
declare previous_status public.verification_status;
begin
  if auth.uid() is null or (select role from public.profiles where id = auth.uid()) not in ('admin', 'government', 'university_admin') then
    raise exception 'Not authorised to review challenges';
  end if;
  select verification into previous_status from public.challenges where id = challenge_uuid for update;
  if previous_status is null then raise exception 'Challenge not found'; end if;
  update public.challenges set verification = next_status,
    stage = case when next_status in ('community_verified', 'officially_verified') and stage = 'reported' then 'validated' else stage end
  where id = challenge_uuid;
  insert into public.verification_events(challenge_id, actor_id, status, method, note)
  values (challenge_uuid, auth.uid(), next_status, left(coalesce(review_method, 'manual review'), 120), nullif(left(review_note, 5000), ''));
  insert into public.audit_logs(actor_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), 'verification_reviewed', 'challenge', challenge_uuid,
    jsonb_build_object('old_status', previous_status, 'new_status', next_status, 'method', review_method, 'note', review_note));
end;
$$;
revoke all on function public.review_challenge(uuid, public.verification_status, text, text) from public;
grant execute on function public.review_challenge(uuid, public.verification_status, text, text) to authenticated;
drop policy if exists "staff reads verification history" on public.verification_events;
create policy "staff reads verification history" on public.verification_events for select to authenticated
using ((select role from public.profiles where id = auth.uid()) in ('admin', 'government', 'university_admin'));

-- Merge retains every report/evidence row and only marks the duplicate card as merged.
create or replace function public.merge_challenge(duplicate_uuid uuid, master_uuid uuid, review_note text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or (select role from public.profiles where id = auth.uid()) not in ('admin', 'government', 'university_admin') then raise exception 'Not authorised to merge challenges'; end if;
  if duplicate_uuid = master_uuid then raise exception 'A challenge cannot merge into itself'; end if;
  perform 1 from public.challenges where id = master_uuid and merged_into_id is null for update;
  if not found then raise exception 'Master challenge not found or already merged'; end if;
  update public.reports set challenge_id = master_uuid where challenge_id = duplicate_uuid;
  update public.challenges set merged_into_id = master_uuid, duplicate_status = 'merged' where id = duplicate_uuid;
  insert into public.audit_logs(actor_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), 'challenge_merged', 'challenge', duplicate_uuid, jsonb_build_object('master_challenge_id', master_uuid, 'note', review_note));
end;
$$;
revoke all on function public.merge_challenge(uuid, uuid, text) from public;
grant execute on function public.merge_challenge(uuid, uuid, text) to authenticated;

-- Notifications and audit trail for lifecycle changes. Ordinary users cannot
-- write or alter audit rows directly.
drop policy if exists "admin reads audit logs" on public.audit_logs;
create policy "admin reads audit logs" on public.audit_logs for select to authenticated
using ((select role from public.profiles where id = auth.uid()) = 'admin');
create or replace function public.audit_assignment_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare recipient uuid;
begin
  select owner_id into recipient from public.organization_accounts where id = new.organization_id;
  insert into public.audit_logs(actor_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), case when tg_op = 'INSERT' then 'assignment_created' else 'assignment_updated' end,
    'problem_assignment', new.id, jsonb_build_object('old_status', case when tg_op = 'INSERT' then null else old.status end, 'new_status', new.status, 'reason', new.unable_reason));
  if recipient is not null then
    insert into public.notifications(recipient_id, kind, title, body, entity_type, entity_id)
    values (recipient, case when tg_op = 'INSERT' then 'assignment_created' else 'assignment_updated' end,
      case when tg_op = 'INSERT' then 'New task assigned' else 'Task status updated' end,
      coalesce(new.unable_reason, 'Open your workspace to review the task.'), 'problem_assignment', new.id);
  end if;
  return new;
end;
$$;
drop trigger if exists assignment_audit_and_notification on public.problem_assignments;
create trigger assignment_audit_and_notification after insert or update on public.problem_assignments
for each row execute procedure public.audit_assignment_change();

alter table public.notifications enable row level security;
drop policy if exists "recipient marks own notification read" on public.notifications;
create policy "recipient marks own notification read" on public.notifications for update to authenticated
using (recipient_id = auth.uid()) with check (recipient_id = auth.uid());
