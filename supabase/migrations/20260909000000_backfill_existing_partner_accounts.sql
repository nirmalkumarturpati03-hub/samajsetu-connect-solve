-- Backfill partner records created before organization_accounts provisioning existed.
-- This runs with migration privileges and reads only the metadata supplied at registration.
insert into public.organization_accounts (
  owner_id,
  name,
  organization_type,
  contact_email,
  latitude,
  longitude,
  expertise,
  capabilities
)
select
  u.id,
  coalesce(nullif(trim(u.raw_user_meta_data ->> 'display_name'), ''), split_part(u.email, '@', 1), 'Organization'),
  coalesce(nullif(trim(u.raw_user_meta_data ->> 'organization_type'), ''), 'Organization'),
  u.email,
  case when coalesce(u.raw_user_meta_data ->> 'latitude', '') ~ '^-?[0-9]+(\.[0-9]+)?$'
    then (u.raw_user_meta_data ->> 'latitude')::numeric else null end,
  case when coalesce(u.raw_user_meta_data ->> 'longitude', '') ~ '^-?[0-9]+(\.[0-9]+)?$'
    then (u.raw_user_meta_data ->> 'longitude')::numeric else null end,
  case when trim(coalesce(u.raw_user_meta_data ->> 'expertise', '')) = '' then '{}'
    else regexp_split_to_array(trim(u.raw_user_meta_data ->> 'expertise'), '\s*,\s*') end,
  case when trim(coalesce(u.raw_user_meta_data ->> 'resources', '')) = '' then '{}'
    else regexp_split_to_array(trim(u.raw_user_meta_data ->> 'resources'), '\s*,\s*') end
from auth.users u
where u.raw_user_meta_data ->> 'account_type' = 'organization'
on conflict (owner_id) do nothing;
