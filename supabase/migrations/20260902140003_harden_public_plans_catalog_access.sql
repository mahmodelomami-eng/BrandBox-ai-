-- Brand Box AI — public pricing catalog access hardening.
-- Active plans are public catalog data. Keep writes server-only and avoid
-- calling privileged role helpers from the anonymous read policy.

REVOKE ALL ON TABLE public.plans FROM anon, authenticated;
GRANT SELECT ON TABLE public.plans TO anon, authenticated;

DROP POLICY IF EXISTS "Anyone can read active plans" ON public.plans;
DROP POLICY IF EXISTS "Public can read active plans" ON public.plans;

CREATE POLICY "Public can read active plans"
ON public.plans
FOR SELECT
TO anon, authenticated
USING (is_active = TRUE);
