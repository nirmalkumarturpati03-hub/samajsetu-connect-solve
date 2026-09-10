-- Public financial transparency is source-based. Utilization is maintained by
-- authorised admins and is never allowed to exceed received funds.
alter table public.funding_sources
  add column if not exists utilized_amount numeric(14,2) not null default 0 check (utilized_amount >= 0 and utilized_amount <= amount),
  add column if not exists utilization_description text,
  add column if not exists project_category text,
  add column if not exists area text,
  add column if not exists supporting_reference text;

create or replace function public.update_funding_utilization(
  source_uuid uuid, next_utilized numeric, description text default null
) returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or (select role from public.profiles where id = auth.uid()) <> 'admin' then
    raise exception 'Only administrators may update fund utilization';
  end if;
  update public.funding_sources
  set utilized_amount = next_utilized, utilization_description = nullif(trim(description), ''), updated_at = now()
  where id = source_uuid and next_utilized between 0 and amount;
  if not found then raise exception 'Utilized amount must be between zero and the amount received'; end if;
end;
$$;
revoke all on function public.update_funding_utilization(uuid, numeric, text) from public;
grant execute on function public.update_funding_utilization(uuid, numeric, text) to authenticated;
