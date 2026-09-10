-- Secure password reset request throttling and business-day task response deadlines.
-- Supabase Auth owns reset-token creation, expiry, and single-use invalidation;
-- this table only limits requests before an email is sent.
create table if not exists public.password_reset_request_limits (
  email_hash text primary key,
  window_started_at timestamptz not null default now(),
  attempts integer not null default 0 check (attempts >= 0 and attempts <= 4),
  blocked_until timestamptz
);
alter table public.password_reset_request_limits enable row level security;

create or replace function public.request_password_reset(requested_email text)
returns void language plpgsql security definer set search_path = public as $$
declare key text := md5(lower(trim(requested_email))); current_row public.password_reset_request_limits%rowtype;
begin
  if requested_email is null or requested_email !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'Enter a valid registered email address.';
  end if;
  insert into public.password_reset_request_limits(email_hash, attempts)
  values (key, 0) on conflict (email_hash) do nothing;
  select * into current_row from public.password_reset_request_limits where email_hash = key for update;
  if current_row.blocked_until is not null and current_row.blocked_until > now() then
    raise exception 'Maximum password reset attempts reached. Please try again later.';
  end if;
  if current_row.window_started_at + interval '1 hour' <= now() then
    update public.password_reset_request_limits set attempts = 1, window_started_at = now(), blocked_until = null where email_hash = key;
  elsif current_row.attempts >= 4 then
    update public.password_reset_request_limits set blocked_until = now() + interval '1 hour' where email_hash = key;
    raise exception 'Maximum password reset attempts reached. Please try again later.';
  else
    update public.password_reset_request_limits set attempts = attempts + 1 where email_hash = key;
  end if;
end;
$$;
revoke all on function public.request_password_reset(text) from public;
grant execute on function public.request_password_reset(text) to anon, authenticated;

create table if not exists public.public_holidays (
  holiday_date date primary key,
  name text not null,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);
alter table public.public_holidays enable row level security;
drop policy if exists "admins manage public holidays" on public.public_holidays;
create policy "admins manage public holidays" on public.public_holidays for all to authenticated
  using ((select role from public.profiles where id = auth.uid()) = 'admin')
  with check ((select role from public.profiles where id = auth.uid()) = 'admin');

create or replace function public.assignment_response_deadline(assigned_at timestamptz default now())
returns timestamptz language plpgsql stable security definer set search_path = public as $$
declare response_days integer := 0; candidate date := assigned_at::date;
begin
  while response_days < 3 loop
    candidate := candidate + 1;
    if extract(isodow from candidate) < 6 and not exists (select 1 from public.public_holidays where holiday_date = candidate) then
      response_days := response_days + 1;
    end if;
  end loop;
  return candidate::timestamp + coalesce(assigned_at::time, time '23:59:59');
end;
$$;

alter table public.problem_assignments alter column acceptance_deadline drop default;
alter table public.problem_assignments alter column acceptance_deadline set default public.assignment_response_deadline(now());
update public.problem_assignments set acceptance_deadline = public.assignment_response_deadline(created_at)
where status = 'pending' and accepted_at is null;

create or replace function public.expire_unaccepted_assignments()
returns integer language plpgsql security definer set search_path = public as $$
declare expired_count integer; expired record; replacement uuid;
begin
  for expired in
    update public.problem_assignments
    set status = 'unable_to_resolve', unable_reason = 'No Response – Reassignment Required'
    where status = 'pending' and accepted_at is null and acceptance_deadline <= now()
    returning id, challenge_id, unable_reason
  loop
    select public.allocate_smart_task(expired.challenge_id,
      coalesce((select array_agg(distinct organization_id) from public.problem_assignments where challenge_id = expired.challenge_id), '{}')) into replacement;
    if replacement is not null then
      insert into public.problem_transfers (assignment_id, to_organization_id, reason)
      select expired.id, organization_id, expired.unable_reason from public.problem_assignments where id = replacement;
    end if;
  end loop;
  get diagnostics expired_count = row_count;
  return expired_count;
end;
$$;
