-- Brand Box AI — explicit deny policies for server-only billing tables
BEGIN;

DROP POLICY IF EXISTS billing_settings_explicit_deny ON public.billing_settings;
CREATE POLICY billing_settings_explicit_deny ON public.billing_settings
FOR ALL TO anon, authenticated
USING (FALSE)
WITH CHECK (FALSE);

DROP POLICY IF EXISTS ai_model_catalog_explicit_deny ON public.ai_model_catalog;
CREATE POLICY ai_model_catalog_explicit_deny ON public.ai_model_catalog
FOR ALL TO anon, authenticated
USING (FALSE)
WITH CHECK (FALSE);

DROP POLICY IF EXISTS credit_rollover_holds_explicit_deny ON public.credit_rollover_holds;
CREATE POLICY credit_rollover_holds_explicit_deny ON public.credit_rollover_holds
FOR ALL TO anon, authenticated
USING (FALSE)
WITH CHECK (FALSE);

DROP POLICY IF EXISTS generation_financials_explicit_deny ON public.generation_financials;
CREATE POLICY generation_financials_explicit_deny ON public.generation_financials
FOR ALL TO anon, authenticated
USING (FALSE)
WITH CHECK (FALSE);

COMMIT;
