BEGIN;

CREATE INDEX IF NOT EXISTS idx_assets_generation_id ON public.assets(generation_id);
CREATE INDEX IF NOT EXISTS idx_assets_project_id ON public.assets(project_id);
CREATE INDEX IF NOT EXISTS idx_credit_idempotency_transaction_id ON public.credit_idempotency(transaction_id);
CREATE INDEX IF NOT EXISTS idx_credit_idempotency_user_id ON public.credit_idempotency(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_actor_id ON public.credit_transactions(actor_id);
CREATE INDEX IF NOT EXISTS idx_generations_project_id ON public.generations(project_id);
CREATE INDEX IF NOT EXISTS idx_payment_idempotency_user_id ON public.payment_idempotency(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan_id ON public.subscriptions(plan_id);
DROP INDEX IF EXISTS public.idx_audit_logs_actor_created;

DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile" ON public.profiles FOR SELECT USING (
  (SELECT auth.uid()) = id OR (SELECT public.get_user_role((SELECT auth.uid()))) IN ('SUPER_ADMIN','ADMIN','SUPPORT'));
DROP POLICY IF EXISTS "Anyone can read active plans" ON public.plans;
CREATE POLICY "Anyone can read active plans" ON public.plans FOR SELECT USING (
  is_active = true OR (SELECT public.get_user_role((SELECT auth.uid()))) IN ('SUPER_ADMIN','ADMIN'));
DROP POLICY IF EXISTS "Users can read own subscriptions" ON public.subscriptions;
CREATE POLICY "Users can read own subscriptions" ON public.subscriptions FOR SELECT USING (
  (SELECT auth.uid()) = user_id OR (SELECT public.get_user_role((SELECT auth.uid()))) IN ('SUPER_ADMIN','ADMIN','SUPPORT'));
DROP POLICY IF EXISTS "Users can read own payment transactions" ON public.payment_transactions;
CREATE POLICY "Users can read own payment transactions" ON public.payment_transactions FOR SELECT USING (
  (SELECT auth.uid()) = user_id OR (SELECT public.get_user_role((SELECT auth.uid()))) IN ('SUPER_ADMIN','ADMIN','SUPPORT'));
DROP POLICY IF EXISTS "Users can read own credit ledger" ON public.credit_transactions;
CREATE POLICY "Users can read own credit ledger" ON public.credit_transactions FOR SELECT USING (
  (SELECT auth.uid()) = user_id OR (SELECT public.get_user_role((SELECT auth.uid()))) IN ('SUPER_ADMIN','ADMIN'));
DROP POLICY IF EXISTS "Users can read own credit idempotency" ON public.credit_idempotency;
CREATE POLICY "Users can read own credit idempotency" ON public.credit_idempotency FOR SELECT USING (
  (SELECT auth.uid()) = user_id OR (SELECT public.get_user_role((SELECT auth.uid()))) IN ('SUPER_ADMIN','ADMIN'));
DROP POLICY IF EXISTS "Admins can read audit logs" ON public.audit_logs;
CREATE POLICY "Admins can read audit logs" ON public.audit_logs FOR SELECT USING (
  (SELECT public.get_user_role((SELECT auth.uid()))) IN ('SUPER_ADMIN','ADMIN'));
DROP POLICY IF EXISTS "Users can manage own projects" ON public.projects;
CREATE POLICY "Users can manage own projects" ON public.projects FOR ALL USING (
  (SELECT auth.uid()) = owner_id OR (SELECT public.get_user_role((SELECT auth.uid()))) IN ('SUPER_ADMIN','ADMIN','SUPPORT'));
DROP POLICY IF EXISTS "Users can manage own generations" ON public.generations;
CREATE POLICY "Users can manage own generations" ON public.generations FOR ALL USING (
  (SELECT auth.uid()) = user_id OR (SELECT public.get_user_role((SELECT auth.uid()))) IN ('SUPER_ADMIN','ADMIN','SUPPORT'));
DROP POLICY IF EXISTS "Users can manage own assets" ON public.assets;
CREATE POLICY "Users can manage own assets" ON public.assets FOR ALL USING (
  (SELECT auth.uid()) = user_id OR (SELECT public.get_user_role((SELECT auth.uid()))) IN ('SUPER_ADMIN','ADMIN','SUPPORT'));

COMMIT;
