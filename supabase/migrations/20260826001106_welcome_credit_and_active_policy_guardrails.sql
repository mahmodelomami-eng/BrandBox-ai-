BEGIN;

UPDATE public.plans
SET monthly_credits = 0,
    metadata = COALESCE(metadata,'{}'::jsonb) || jsonb_build_object(
      'welcome_credits', 50,
      'welcome_credit_valid_days', 30,
      'pricing_status', 'pilot_v1',
      'credit_label', 'Credit',
      'audience', 'تجربة المنصة',
      'rollover_note', 'لا يوجد ترحيل في الخطة المجانية'
    ),
    updated_at = NOW()
WHERE id = 'free';

CREATE UNIQUE INDEX IF NOT EXISTS uq_legal_policy_versions_one_active_type
  ON public.legal_policy_versions(policy_type)
  WHERE is_active = TRUE;

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id, email, first_name, last_name, phone, avatar_url, role, status, credit_balance
  ) VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data ->> 'first_name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'last_name', ''),
    COALESCE(NEW.phone, NEW.raw_user_meta_data ->> 'phone'),
    NEW.raw_user_meta_data ->> 'avatar_url',
    'USER'::public.app_role,
    'active',
    50
  )
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        updated_at = NOW();

  INSERT INTO public.credit_lots(
    user_id,
    source_type,
    original_amount,
    remaining_amount,
    expires_at,
    order_reference,
    metadata
  ) VALUES (
    NEW.id,
    'bonus',
    50,
    50,
    NOW() + INTERVAL '30 days',
    'welcome:' || NEW.id::text,
    jsonb_build_object(
      'kind','welcome_credit',
      'valid_days',30
    )
  )
  ON CONFLICT (order_reference, source_type)
  DO NOTHING;

  RETURN NEW;
END;
$$;

REVOKE ALL
ON FUNCTION public.handle_new_auth_user()
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE
ON FUNCTION public.handle_new_auth_user()
TO service_role;

COMMIT;
