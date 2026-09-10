-- Password-reset gate: throttle every request, then confirm the address exists
-- privately before the browser asks Supabase Auth to issue a recovery email.
-- Auth recovery links are signed, expire according to Auth settings, and become
-- unusable after updateUser consumes the recovery session.
drop function if exists public.request_password_reset(text);
create function public.request_password_reset(requested_email text)
returns boolean language plpgsql security definer set search_path = public, auth as $$
declare
  request_key text := md5(lower(trim(requested_email)));
  current_row public.password_reset_request_limits%rowtype;
begin
  if requested_email is null or requested_email !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'Enter a valid registered email address.';
  end if;

  insert into public.password_reset_request_limits(email_hash, attempts)
  values (request_key, 0) on conflict (email_hash) do nothing;
  select * into current_row from public.password_reset_request_limits where email_hash = request_key for update;

  if current_row.blocked_until is not null and current_row.blocked_until > now() then
    raise exception 'Maximum password reset attempts reached. Please try again later.';
  end if;
  if current_row.window_started_at + interval '1 hour' <= now() then
    update public.password_reset_request_limits set attempts = 1, window_started_at = now(), blocked_until = null where email_hash = request_key;
  elsif current_row.attempts >= 4 then
    update public.password_reset_request_limits set blocked_until = now() + interval '1 hour' where email_hash = request_key;
    raise exception 'Maximum password reset attempts reached. Please try again later.';
  else
    update public.password_reset_request_limits set attempts = attempts + 1 where email_hash = request_key;
  end if;

  return exists (select 1 from auth.users where lower(email) = lower(trim(requested_email)));
end;
$$;
revoke all on function public.request_password_reset(text) from public;
grant execute on function public.request_password_reset(text) to anon, authenticated;
