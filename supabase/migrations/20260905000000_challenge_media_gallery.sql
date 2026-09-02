-- Public, post-ready copies of reporter-selected media. Private evidence remains in `evidence`.
do $$
declare existing_constraint text;
begin
  select conname into existing_constraint
  from pg_constraint
  where conrelid = 'public.evidence'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) like '%mime_type%';
  if existing_constraint is not null then
    execute format('alter table public.evidence drop constraint %I', existing_constraint);
  end if;
end;
$$;
alter table public.evidence add constraint evidence_mime_type_check
  check (mime_type in ('image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm', 'audio/webm', 'audio/mpeg', 'application/pdf'));

update storage.buckets
set allowed_mime_types = array['image/jpeg','image/png','image/webp','video/mp4','video/webm','audio/webm','audio/mpeg','application/pdf']
where id = 'evidence';

create table public.challenge_media (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.challenges(id) on delete cascade,
  storage_path text not null unique,
  mime_type text not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm')),
  created_at timestamptz not null default now()
);

create index challenge_media_challenge_idx on public.challenge_media (challenge_id, created_at);
alter table public.challenge_media enable row level security;
create policy "challenge gallery visible" on public.challenge_media for select using (true);

-- The gallery bucket is public by design, but only authenticated reporters can add files under
-- their own folder. It supports the image and video formats accepted by the upload UI.
update storage.buckets
set allowed_mime_types = array['image/jpeg','image/png','image/webp','video/mp4','video/webm']
where id = 'challenge-previews';

create or replace function public.add_challenge_media(
  challenge_uuid uuid,
  media_path text,
  media_mime_type text
) returns void
language plpgsql security definer set search_path = public as $$
begin
  if media_mime_type not in ('image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm') then
    raise exception 'Unsupported challenge gallery media type';
  end if;

  if not exists (
    select 1 from public.challenges
    where id = challenge_uuid
      and created_by = auth.uid()
      and media_path like auth.uid()::text || '/' || challenge_uuid::text || '/%'
  ) then
    raise exception 'Not permitted to add challenge media';
  end if;

  insert into public.challenge_media (challenge_id, storage_path, mime_type)
  values (challenge_uuid, media_path, media_mime_type)
  on conflict (storage_path) do nothing;
end;
$$;

revoke all on function public.add_challenge_media(uuid, text, text) from public;
grant execute on function public.add_challenge_media(uuid, text, text) to authenticated;

drop function public.search_challenges(text, text, text);
create function public.search_challenges(search_text text default '', district_filter text default null, domain_filter text default null) returns table (
  id uuid, public_id text, title text, domain text, district text, priority_score smallint, verification public.verification_status, stage public.project_stage, affected_population integer, reports bigint, created_at timestamptz, preview_image_path text, media jsonb
) language sql stable security invoker set search_path = public as $$
  select c.id,c.public_id,c.title,c.domain,c.district,c.priority_score,c.verification,c.stage,c.affected_population,
    coalesce((select count(*) from public.reports r where r.challenge_id=c.id),0) + coalesce((select count(*) from public.challenge_supports s where s.challenge_id=c.id),0),
    c.created_at,c.preview_image_path,
    coalesce((select jsonb_agg(jsonb_build_object('path', cm.storage_path, 'type', cm.mime_type) order by cm.created_at)
      from public.challenge_media cm where cm.challenge_id = c.id), '[]'::jsonb)
  from public.challenges c
  where (search_text='' or c.title ilike '%' || search_text || '%' or c.domain ilike '%' || search_text || '%')
    and (district_filter is null or c.district=district_filter) and (domain_filter is null or c.domain=domain_filter)
  order by c.priority_score desc,c.created_at desc;
$$;
