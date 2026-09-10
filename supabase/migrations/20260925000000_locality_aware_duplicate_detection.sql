-- Public reporting remains anonymous, but a citizen must be guided to support
-- an existing issue when its title and location indicate the same problem.
-- The function returns only public challenge information; exact report details
-- and evidence remain inaccessible to anonymous callers.
create or replace function public.find_possible_duplicates_v2(
  problem_title text,
  problem_description text,
  problem_domain text,
  problem_lat numeric,
  problem_lng numeric,
  problem_district text default null,
  problem_locality text default null
)
returns table(
  challenge_id uuid,
  public_id text,
  title text,
  duplicate_score numeric
)
language sql stable security definer set search_path = public as $$
  with input as (
    select
      lower(regexp_replace(trim(coalesce(problem_title, '')), '[^[:alnum:]]+', '', 'g')) as title_key,
      lower(trim(coalesce(problem_district, ''))) as district_key,
      lower(trim(coalesce(problem_locality, ''))) as locality_key
  ),
  tokens as (
    select distinct lower(word) as word
    from regexp_split_to_table(coalesce(problem_title, '') || ' ' || coalesce(problem_description, ''), '\s+') as word
    where length(word) > 2
  ),
  scored as (
    select
      c.id,
      c.public_id,
      c.title,
      c.created_at,
      case
        when lower(regexp_replace(trim(c.title), '[^[:alnum:]]+', '', 'g')) = (select title_key from input) then 100::numeric
        else round(coalesce((select count(*) from tokens t where lower(c.title || ' ' || c.summary) like '%' || t.word || '%'), 0)::numeric / greatest(1, (select count(*) from tokens)) * 100, 2)
      end as text_similarity,
      round(case
        when problem_lat is null or problem_lng is null or c.public_latitude is null or c.public_longitude is null then 0
        else greatest(0, 100 - least(100, public.haversine_km(problem_lat, problem_lng, c.public_latitude, c.public_longitude) * 10))
      end, 2) as radius_similarity,
      case when lower(coalesce(c.domain, '')) = lower(coalesce(problem_domain, '')) then 100::numeric else 0::numeric end as category_match,
      case
        when (select locality_key from input) <> ''
          and lower(coalesce(c.locality, '')) = (select locality_key from input)
          and ((select district_key from input) = '' or lower(coalesce(c.district, '')) = (select district_key from input)) then 100::numeric
        else 0::numeric
      end as locality_match
    from public.challenges c
    where c.merged_into_id is null
  )
  select
    id,
    public_id,
    title,
    round(text_similarity * .60 + radius_similarity * .20 + category_match * .10 + locality_match * .10, 2) as duplicate_score
  from scored
  where text_similarity >= 45
    or (radius_similarity >= 70 and category_match = 100)
    or (locality_match = 100 and text_similarity >= 30)
  order by duplicate_score desc, created_at desc
  limit 5;
$$;

revoke all on function public.find_possible_duplicates_v2(text, text, text, numeric, numeric, text, text) from public;
grant execute on function public.find_possible_duplicates_v2(text, text, text, numeric, numeric, text, text) to anon, authenticated;
