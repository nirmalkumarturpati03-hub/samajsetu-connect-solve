-- Public financial transparency. Amounts are ledger entries, not mutable
-- display counters; privileged edits are audited and citizens see only verified
-- public records.
do $$ begin
  create type public.funding_category as enum ('government', 'industry_csr', 'samajsetu_trust', 'university', 'ngo', 'other_approved');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.financial_transaction_type as enum ('approval', 'release', 'expenditure', 'adjustment');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.financial_record_status as enum ('pending', 'verified', 'rejected');
exception when duplicate_object then null; end $$;

create table if not exists public.funding_sources (
  id uuid primary key default gen_random_uuid(),
  category public.funding_category not null,
  donor_name text not null,
  amount numeric(14,2) not null check (amount > 0),
  received_on date not null,
  purpose text not null,
  restrictions text,
  status public.financial_record_status not null default 'pending',
  created_by uuid not null references public.profiles(id),
  verified_by uuid references public.profiles(id), verified_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.project_financials (
  project_id uuid primary key references public.projects(id) on delete restrict,
  estimated_cost numeric(14,2) check (estimated_cost >= 0),
  approved_budget numeric(14,2) check (approved_budget >= 0),
  financial_status text not null default 'planning' check (financial_status in ('planning','approved','in_progress','completed','on_hold')),
  is_public boolean not null default false,
  updated_by uuid references public.profiles(id), updated_at timestamptz not null default now()
);
create table if not exists public.financial_transactions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete restrict,
  funding_source_id uuid references public.funding_sources(id) on delete restrict,
  transaction_type public.financial_transaction_type not null,
  amount numeric(14,2) not null check (amount > 0),
  occurred_on date not null,
  purpose text not null,
  reason text,
  status public.financial_record_status not null default 'pending',
  created_by uuid not null references public.profiles(id),
  verified_by uuid references public.profiles(id), verified_at timestamptz,
  created_at timestamptz not null default now()
);
create table if not exists public.financial_documents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete restrict,
  funding_source_id uuid references public.funding_sources(id) on delete restrict,
  transaction_id uuid references public.financial_transactions(id) on delete restrict,
  document_kind text not null check (document_kind in ('government_approval','funding_approval','cost_estimate','work_order','bill_invoice','payment_record','completion_report','audit_report','before_after_photo','other')),
  storage_path text not null unique, display_name text not null, mime_type text not null,
  is_public boolean not null default false, uploaded_by uuid not null references public.profiles(id), created_at timestamptz not null default now(),
  check (project_id is not null or funding_source_id is not null or transaction_id is not null)
);
create index if not exists funding_sources_public_idx on public.funding_sources(status, received_on desc);
create index if not exists financial_transactions_project_idx on public.financial_transactions(project_id, occurred_on desc);
create index if not exists financial_transactions_public_idx on public.financial_transactions(status, occurred_on desc);

alter table public.funding_sources enable row level security;
alter table public.project_financials enable row level security;
alter table public.financial_transactions enable row level security;
alter table public.financial_documents enable row level security;
drop policy if exists "verified funding sources public read" on public.funding_sources;
drop policy if exists "public project financials read" on public.project_financials;
drop policy if exists "verified transactions public read" on public.financial_transactions;
drop policy if exists "public financial documents read" on public.financial_documents;
drop policy if exists "admins manage funding sources" on public.funding_sources;
drop policy if exists "admins manage project financials" on public.project_financials;
drop policy if exists "admins manage financial transactions" on public.financial_transactions;
drop policy if exists "admins manage financial documents" on public.financial_documents;
create policy "verified funding sources public read" on public.funding_sources for select using (status = 'verified' or (select role from public.profiles where id = auth.uid()) = 'admin');
create policy "public project financials read" on public.project_financials for select using (is_public or (select role from public.profiles where id = auth.uid()) = 'admin');
create policy "verified transactions public read" on public.financial_transactions for select using (status = 'verified' or (select role from public.profiles where id = auth.uid()) = 'admin');
create policy "public financial documents read" on public.financial_documents for select using (is_public or (select role from public.profiles where id = auth.uid()) = 'admin');
create policy "admins manage funding sources" on public.funding_sources for all to authenticated using ((select role from public.profiles where id = auth.uid()) = 'admin') with check ((select role from public.profiles where id = auth.uid()) = 'admin');
create policy "admins manage project financials" on public.project_financials for all to authenticated using ((select role from public.profiles where id = auth.uid()) = 'admin') with check ((select role from public.profiles where id = auth.uid()) = 'admin');
create policy "admins manage financial transactions" on public.financial_transactions for all to authenticated using ((select role from public.profiles where id = auth.uid()) = 'admin') with check ((select role from public.profiles where id = auth.uid()) = 'admin');
create policy "admins manage financial documents" on public.financial_documents for all to authenticated using ((select role from public.profiles where id = auth.uid()) = 'admin') with check ((select role from public.profiles where id = auth.uid()) = 'admin');

-- Documents stay private by default. Only an administrator may upload them,
-- and a citizen can read an object only after its metadata has been explicitly
-- marked public (never expose bank details or other protected attachments).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('financial-documents', 'financial-documents', false, 26214400,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
drop policy if exists "admin financial document upload" on storage.objects;
drop policy if exists "admin financial document delete" on storage.objects;
drop policy if exists "public verified financial document read" on storage.objects;
create policy "admin financial document upload" on storage.objects for insert to authenticated
with check (bucket_id = 'financial-documents' and (select role from public.profiles where id = auth.uid()) = 'admin');
create policy "admin financial document delete" on storage.objects for delete to authenticated
using (bucket_id = 'financial-documents' and (select role from public.profiles where id = auth.uid()) = 'admin');
create policy "public verified financial document read" on storage.objects for select
using (bucket_id = 'financial-documents' and exists (
  select 1 from public.financial_documents d
  where d.storage_path = name and (d.is_public or (select role from public.profiles where id = auth.uid()) = 'admin')
));

create or replace function public.audit_financial_change() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.audit_logs(actor_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), lower(tg_table_name) || '_' || lower(tg_op), tg_table_name, coalesce(new.id, old.id),
    jsonb_build_object('old', case when tg_op = 'INSERT' then null else to_jsonb(old) end, 'new', case when tg_op = 'DELETE' then null else to_jsonb(new) end));
  return coalesce(new, old);
end;
$$;
drop trigger if exists funding_sources_financial_audit on public.funding_sources;
drop trigger if exists financial_transactions_audit on public.financial_transactions;
create trigger funding_sources_financial_audit after insert or update or delete on public.funding_sources for each row execute procedure public.audit_financial_change();
create trigger financial_transactions_audit after insert or update or delete on public.financial_transactions for each row execute procedure public.audit_financial_change();

create or replace function public.public_funding_dashboard()
returns table(category text, received numeric, utilized numeric, available numeric) language sql stable security definer set search_path = public as $$
  with incoming as (select category::text category, sum(amount) amount from public.funding_sources where status = 'verified' group by category),
  spent as (select sum(amount) amount from public.financial_transactions where status = 'verified' and transaction_type = 'expenditure')
  select coalesce(i.category, 'total'), coalesce(i.amount, 0),
    case when i.category is null then coalesce((select amount from spent), 0) else 0 end,
    case when i.category is null then coalesce(i.amount, 0) - coalesce((select amount from spent), 0) else coalesce(i.amount, 0) end
  from incoming i union all select 'total', coalesce(sum(amount), 0), coalesce((select amount from spent), 0), coalesce(sum(amount), 0) - coalesce((select amount from spent), 0) from incoming;
$$;
grant execute on function public.public_funding_dashboard() to anon, authenticated;
