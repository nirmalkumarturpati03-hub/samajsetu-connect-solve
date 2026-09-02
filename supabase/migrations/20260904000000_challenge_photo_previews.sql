-- Original evidence remains private. This separate, opt-in image copy is used only on public challenge cards.
alter table public.challenges add column if not exists preview_image_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('challenge-previews', 'challenge-previews', true, 26214400, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = true;

create policy "challenge preview upload owner folder"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'challenge-previews'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create or replace function public.set_challenge_preview(challenge_uuid uuid, preview_path text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- A reporter may set one preview for a challenge they created. They cannot update other fields.
  update public.challenges
  set preview_image_path = preview_path
  where id = challenge_uuid
    and created_by = auth.uid()
    and preview_image_path is null
    and preview_path like auth.uid()::text || '/' || challenge_uuid::text || '/%';
end;
$$;

revoke all on function public.set_challenge_preview(uuid, text) from public;
grant execute on function public.set_challenge_preview(uuid, text) to authenticated;

drop function public.search_challenges(text, text, text);
create or replace function public.search_challenges(search_text text default '', district_filter text default null, domain_filter text default null) returns table (
  id uuid, public_id text, title text, domain text, district text, priority_score smallint, verification public.verification_status, stage public.project_stage, affected_population integer, reports bigint, created_at timestamptz, preview_image_path text
) language sql stable security invoker set search_path = public as $$
  select c.id,c.public_id,c.title,c.domain,c.district,c.priority_score,c.verification,c.stage,c.affected_population,
    coalesce((select count(*) from public.reports r where r.challenge_id=c.id),0) + coalesce((select count(*) from public.challenge_supports s where s.challenge_id=c.id),0),c.created_at,c.preview_image_path
  from public.challenges c
  where (search_text='' or c.title ilike '%' || search_text || '%' or c.domain ilike '%' || search_text || '%')
    and (district_filter is null or c.district=district_filter) and (domain_filter is null or c.domain=domain_filter)
  order by c.priority_score desc,c.created_at desc;
$$;
