-- Admin-only visibility and partner account controls for the Admin Control Center.
alter table public.organization_accounts
  add column if not exists account_status text not null default 'Active'
  check (account_status in ('Active', 'Suspended', 'Deactivated'));

drop policy if exists "admins read all partner accounts" on public.organization_accounts;
drop policy if exists "admins manage partner accounts" on public.organization_accounts;
drop policy if exists "admins read all partner members" on public.volunteers;
drop policy if exists "admins read all assignments" on public.problem_assignments;
drop policy if exists "admins read all task records" on public.problem_tasks;
drop policy if exists "admins read all reassignment records" on public.problem_transfers;

create policy "admins read all partner accounts"
  on public.organization_accounts for select to authenticated
  using ((select role from public.profiles where id = auth.uid()) = 'admin');

create policy "admins manage partner accounts"
  on public.organization_accounts for update to authenticated
  using ((select role from public.profiles where id = auth.uid()) = 'admin')
  with check ((select role from public.profiles where id = auth.uid()) = 'admin');

create policy "admins read all partner members"
  on public.volunteers for select to authenticated
  using ((select role from public.profiles where id = auth.uid()) = 'admin');

create policy "admins read all assignments"
  on public.problem_assignments for select to authenticated
  using ((select role from public.profiles where id = auth.uid()) = 'admin');

create policy "admins read all task records"
  on public.problem_tasks for select to authenticated
  using ((select role from public.profiles where id = auth.uid()) = 'admin');

create policy "admins read all reassignment records"
  on public.problem_transfers for select to authenticated
  using ((select role from public.profiles where id = auth.uid()) = 'admin');
