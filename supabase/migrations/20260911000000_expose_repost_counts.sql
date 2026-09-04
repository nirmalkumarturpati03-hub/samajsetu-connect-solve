-- Keep report and repost totals distinct so the public feed can accurately show reposts.
drop function if exists public.search_challenges(text, text, text);
create function public.search_challenges(search_text text default '', district_filter text default null, domain_filter text default null) returns table (
  id uuid, public_id text, title text, domain text, district text, priority_score smallint,
  verification public.verification_status, stage public.project_stage, affected_population integer,
  reports bigint, reposts bigint, created_at timestamptz, preview_image_path text, media jsonb, comments jsonb
) language sql stable security invoker set search_path = public as $$
  select c.id,c.public_id,c.title,c.domain,c.district,c.priority_score,c.verification,c.stage,c.affected_population,
    coalesce((select count(*) from public.reports r where r.challenge_id=c.id),0),
    coalesce((select count(*) from public.challenge_supports s where s.challenge_id=c.id),0),
    c.created_at,c.preview_image_path,
    coalesce((select jsonb_agg(jsonb_build_object('path', cm.storage_path, 'type', cm.mime_type) order by cm.created_at)
      from public.challenge_media cm where cm.challenge_id = c.id), '[]'::jsonb),
    coalesce((select jsonb_agg(jsonb_build_object('id', s.id, 'note', s.note, 'created_at', s.created_at) order by s.created_at desc)
      from public.challenge_supports s where s.challenge_id = c.id and s.note is not null and btrim(s.note) <> ''), '[]'::jsonb)
  from public.challenges c
  where (search_text='' or c.title ilike '%' || search_text || '%' or c.domain ilike '%' || search_text || '%')
    and (district_filter is null or c.district=district_filter) and (domain_filter is null or c.domain=domain_filter)
  order by c.priority_score desc,c.created_at desc;
$$;
