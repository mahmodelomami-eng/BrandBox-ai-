-- Brand Box AI — foreign key indexes for billing and rollover tables
BEGIN;
CREATE INDEX IF NOT EXISTS idx_billing_settings_updated_by ON public.billing_settings(updated_by);
CREATE INDEX IF NOT EXISTS idx_credit_lots_plan_id ON public.credit_lots(plan_id);
CREATE INDEX IF NOT EXISTS idx_credit_lots_subscription_id ON public.credit_lots(subscription_id);
CREATE INDEX IF NOT EXISTS idx_credit_rollover_holds_plan_id ON public.credit_rollover_holds(plan_id);
COMMIT;
