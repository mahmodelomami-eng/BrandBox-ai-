-- Explicit deny policies for internal service-role tables.
-- These tables are not directly accessible to anon/authenticated roles; service_role bypasses RLS.

drop policy if exists credit_lots_authenticated_deny_all on public.credit_lots;
create policy credit_lots_authenticated_deny_all on public.credit_lots
for all to authenticated
using (false)
with check (false);

drop policy if exists credit_packages_authenticated_deny_all on public.credit_packages;
create policy credit_packages_authenticated_deny_all on public.credit_packages
for all to authenticated
using (false)
with check (false);

drop policy if exists payment_idempotency_authenticated_deny_all on public.payment_idempotency;
create policy payment_idempotency_authenticated_deny_all on public.payment_idempotency
for all to authenticated
using (false)
with check (false);

drop policy if exists rate_limit_hits_authenticated_deny_all on public.rate_limit_hits;
create policy rate_limit_hits_authenticated_deny_all on public.rate_limit_hits
for all to authenticated
using (false)
with check (false);
