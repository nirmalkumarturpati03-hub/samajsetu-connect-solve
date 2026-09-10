-- The public explorer needs the already-public challenge summary for its
-- selected-problem view. Private reporter descriptions and exact locations are
-- deliberately not included.
drop function if exists public.search_challenges(text, text, text);

create function public.search_challenges(search_text text default '', district_filter text default null, domain_filter text default null)
returns table (
  id uuid, public_id text, title text, summary text, domain text, district text,
  priority_score smallint, priority_level text, verification public.verification_status,
  stage public.project_stage, affected_population integer, reports bigint, reposts bigint,
  created_at timestamptz, preview_image_path text, media jsonb, comments jsonb,
  public_latitude numeric, public_longitude numeric, assignment_status text,
  participant_count integer
)
language sql stable security definer set search_path = public as $$
  select c.id, c.public_id, c.title, c.summary, c.domain, c.district,
    c.priority_score, c.priority_level, c.verification, c.stage, c.affected_population,
    coalesce((select count(*) from public.reports r where r.challenge_id = c.id), 0),
    coalesce((select count(*) from public.challenge_supports s where s.challenge_id = c.id), 0),
    c.created_at, c.preview_image_path,
    coalesce((select jsonb_agg(jsonb_build_object('path', cm.storage_path, 'type', cm.mime_type) order by cm.created_at)
      from public.challenge_media cm where cm.challenge_id = c.id), '[]'::jsonb),
    coalesce((select jsonb_agg(jsonb_build_object('id', s.id, 'note', s.note, 'created_at', s.created_at) order by s.created_at desc)
      from public.challenge_supports s where s.challenge_id = c.id and s.note is not null and btrim(s.note) <> ''), '[]'::jsonb),
    c.public_latitude, c.public_longitude, latest.status::text, coalesce(latest.participant_count, 0)::integer
  from public.challenges c
  left join lateral (
    select a.status, (select count(*) from public.problem_tasks t where t.assignment_id = a.id) as participant_count
    from public.problem_assignments a where a.challenge_id = c.id order by a.created_at desc limit 1
  ) latest on true
  where c.merged_into_id is null
    and (search_text = '' or c.title ilike '%' || search_text || '%' or c.domain ilike '%' || search_text || '%' or c.summary ilike '%' || search_text || '%')
    and (district_filter is null or c.district = district_filter)
    and (domain_filter is null or c.domain = domain_filter)
  order by c.priority_score desc, case when c.priority_level = 'CRITICAL' then 1 else 0 end desc, c.urgency desc, c.created_at asc;
$$;

revoke all on function public.search_challenges(text, text, text) from public;
grant execute on function public.search_challenges(text, text, text) to anon, authenticated;
