-- Every assignment is queued in the same transaction that allocates it. The
-- Edge Function fetches the authoritative task data at delivery time, so email
-- content cannot be spoofed by a browser payload.
create extension if not exists pg_net;

create table if not exists public.task_allocation_email_outbox (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null unique references public.problem_assignments(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'sending', 'sent', 'failed')),
  attempts integer not null default 0 check (attempts >= 0),
  provider_message_id text,
  last_error text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists task_allocation_email_outbox_pending_idx
  on public.task_allocation_email_outbox (created_at) where status in ('pending', 'failed');

alter table public.task_allocation_email_outbox enable row level security;
drop policy if exists "admins read task allocation email outbox" on public.task_allocation_email_outbox;
create policy "admins read task allocation email outbox"
  on public.task_allocation_email_outbox for select to authenticated
  using ((select role from public.profiles where id = auth.uid()) = 'admin');

create or replace function public.queue_task_allocation_email()
returns trigger language plpgsql security definer set search_path = public, net as $$
declare dispatch_url text := current_setting('app.settings.task_email_webhook_url', true);
declare dispatch_secret text := current_setting('app.settings.task_email_dispatch_secret', true);
begin
  insert into public.task_allocation_email_outbox (assignment_id)
  values (new.id)
  on conflict (assignment_id) do nothing;

  -- pg_net executes after the transaction commits. These settings are supplied
  -- by the deployment environment, not by application users.
  if coalesce(dispatch_url, '') <> '' and coalesce(dispatch_secret, '') <> '' then
    begin
      perform net.http_post(
        url := dispatch_url,
        body := jsonb_build_object('assignmentId', new.id),
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-task-dispatch-secret', dispatch_secret
        )
      );
    exception when others then
      -- Assignment delivery must never be lost because an email provider is
      -- temporarily unavailable. The pending outbox record can be retried.
      raise warning 'Task allocation email queued but dispatch could not start: %', sqlerrm;
    end;
  end if;
  return new;
end;
$$;

drop trigger if exists assignment_email_outbox on public.problem_assignments;
create trigger assignment_email_outbox
after insert on public.problem_assignments
for each row execute procedure public.queue_task_allocation_email();

-- Deployment configuration (set once by a database owner, never from the UI):
-- alter database postgres set app.settings.task_email_webhook_url =
--   'https://<project-ref>.supabase.co/functions/v1/send-task-allocation-email';
-- alter database postgres set app.settings.task_email_dispatch_secret = '<same value as TASK_EMAIL_DISPATCH_SECRET>';
