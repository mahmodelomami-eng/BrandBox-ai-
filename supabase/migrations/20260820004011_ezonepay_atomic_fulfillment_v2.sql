BEGIN;

CREATE TABLE IF NOT EXISTS public.credit_packages (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, credits INTEGER NOT NULL CHECK (credits > 0),
  price_lyd NUMERIC(12,2) NOT NULL CHECK (price_lyd > 0), is_active BOOLEAN NOT NULL DEFAULT TRUE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.credit_packages ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE public.credit_packages FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.credit_packages TO service_role;

INSERT INTO public.credit_packages (id, name, credits, price_lyd, is_active) VALUES
  ('pkg_100', '100 Credits', 100, 25.00, TRUE),
  ('pkg_500', '550 Credits', 550, 100.00, TRUE),
  ('pkg_1000', '1150 Credits', 1150, 175.00, TRUE),
  ('pkg_5000', '6000 Credits', 6000, 750.00, TRUE)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, credits = EXCLUDED.credits,
  price_lyd = EXCLUDED.price_lyd, is_active = EXCLUDED.is_active, updated_at = NOW();

CREATE UNIQUE INDEX IF NOT EXISTS uq_payment_transactions_provider_tx_id
  ON public.payment_transactions(provider_tx_id) WHERE provider_tx_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.fulfill_ezonepay_payment_atomic_v2(
  p_order_reference TEXT, p_user_id UUID, p_provider_tx_id TEXT, p_amount_lyd NUMERIC,
  p_currency TEXT, p_item_type TEXT, p_item_id TEXT, p_payload_hash TEXT
)
RETURNS TABLE(already_processed BOOLEAN, success BOOLEAN, message TEXT, credits_granted INTEGER,
  payment_id TEXT, subscription_id TEXT, new_balance INTEGER)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_expected_amount NUMERIC(12,2); v_credits INTEGER; v_payment_id TEXT;
  v_subscription_id TEXT; v_new_balance INTEGER; v_inserted INTEGER; v_existing RECORD;
BEGIN
  IF p_order_reference IS NULL OR btrim(p_order_reference) = '' OR p_user_id IS NULL
     OR p_provider_tx_id IS NULL OR btrim(p_provider_tx_id) = '' OR p_amount_lyd IS NULL OR p_amount_lyd <= 0
     OR p_payload_hash IS NULL OR btrim(p_payload_hash) = '' OR p_item_id IS NULL OR btrim(p_item_id) = '' THEN
    RAISE EXCEPTION 'INVALID_PAYMENT_INPUT' USING ERRCODE = '22023';
  END IF;
  IF upper(COALESCE(p_currency, '')) <> 'LYD' THEN
    RAISE EXCEPTION 'UNSUPPORTED_CURRENCY' USING ERRCODE = '22023';
  END IF;
  IF p_item_type = 'purchase' THEN
    SELECT cp.price_lyd, cp.credits INTO v_expected_amount, v_credits
    FROM public.credit_packages cp WHERE cp.id = p_item_id AND cp.is_active = TRUE;
  ELSIF p_item_type = 'subscription' THEN
    SELECT pl.price_monthly_lyd, pl.monthly_credits INTO v_expected_amount, v_credits
    FROM public.plans pl WHERE pl.id = p_item_id AND pl.is_active = TRUE;
  ELSE
    RAISE EXCEPTION 'INVALID_ITEM_TYPE' USING ERRCODE = '22023';
  END IF;
  IF v_expected_amount IS NULL OR v_credits IS NULL THEN
    RAISE EXCEPTION 'INVALID_OR_INACTIVE_ITEM' USING ERRCODE = '22023';
  END IF;
  IF round(p_amount_lyd::numeric, 2) <> round(v_expected_amount::numeric, 2) THEN
    RAISE EXCEPTION 'PAYMENT_AMOUNT_MISMATCH' USING ERRCODE = '22023';
  END IF;

  PERFORM 1 FROM public.profiles WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'PROFILE_NOT_FOUND' USING ERRCODE = 'P0002'; END IF;

  INSERT INTO public.payment_idempotency (order_reference, user_id, status, provider_tx_id, item_type,
    amount_lyd, payload_hash, processed_at, fulfillment_status, error_message)
  VALUES (p_order_reference, p_user_id, 'processed', p_provider_tx_id, p_item_type,
    p_amount_lyd, p_payload_hash, NOW(), 'pending', NULL)
  ON CONFLICT (order_reference) DO NOTHING;
  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  IF v_inserted = 0 THEN
    SELECT * INTO v_existing FROM public.payment_idempotency WHERE order_reference = p_order_reference;
    IF v_existing.user_id IS DISTINCT FROM p_user_id OR v_existing.provider_tx_id IS DISTINCT FROM p_provider_tx_id
       OR v_existing.payload_hash IS DISTINCT FROM p_payload_hash OR v_existing.item_type IS DISTINCT FROM p_item_type
       OR round(v_existing.amount_lyd::numeric, 2) IS DISTINCT FROM round(p_amount_lyd::numeric, 2) THEN
      RAISE EXCEPTION 'IDEMPOTENCY_CONFLICT' USING ERRCODE = '23505';
    END IF;
    IF v_existing.fulfillment_status = 'completed' THEN
      SELECT pt.id INTO v_payment_id FROM public.payment_transactions pt WHERE pt.order_reference = p_order_reference;
      SELECT ct.amount + pr.credit_balance - ct.amount INTO v_new_balance
      FROM public.credit_transactions ct JOIN public.profiles pr ON pr.id = ct.user_id
      WHERE ct.idempotency_key = 'payment:' || p_order_reference LIMIT 1;
      RETURN QUERY SELECT TRUE, TRUE, 'IDEMPOTENT_DUPLICATE_SKIPPED'::TEXT, COALESCE(v_credits, 0),
        v_payment_id, NULL::TEXT, (SELECT credit_balance FROM public.profiles WHERE id = p_user_id);
      RETURN;
    END IF;
    RAISE EXCEPTION 'PAYMENT_ALREADY_IN_PROGRESS' USING ERRCODE = '55000';
  END IF;

  INSERT INTO public.payment_transactions (order_reference, user_id, provider, provider_tx_id, amount_lyd,
    currency, status, item_type, metadata, created_at, updated_at)
  VALUES (p_order_reference, p_user_id, 'Ezone Pay', p_provider_tx_id, p_amount_lyd, 'LYD', 'paid',
    p_item_type, jsonb_build_object('item_id', p_item_id), NOW(), NOW()) RETURNING id INTO v_payment_id;
  UPDATE public.profiles SET credit_balance = credit_balance + v_credits, updated_at = NOW()
  WHERE id = p_user_id RETURNING credit_balance INTO v_new_balance;
  INSERT INTO public.credit_transactions (user_id, amount, transaction_type, description,
    reference_type, reference_id, actor_id, idempotency_key)
  VALUES (p_user_id, v_credits, p_item_type,
    'Ezone Pay ' || CASE WHEN p_item_type='subscription' THEN 'Subscription' ELSE 'Credit Purchase' END || ' (' || p_order_reference || ')',
    p_item_type, p_order_reference, p_user_id, 'payment:' || p_order_reference);
  IF p_item_type = 'subscription' THEN
    v_subscription_id := 'sub_' || gen_random_uuid()::text;
    INSERT INTO public.subscriptions (id, user_id, plan_id, status, provider, external_subscription_id,
      current_period_start, current_period_end, auto_renew, metadata, created_at, updated_at)
    VALUES (v_subscription_id, p_user_id, p_item_id, 'active', 'Ezone Pay', p_provider_tx_id,
      NOW(), NOW() + INTERVAL '30 days', TRUE, jsonb_build_object('order_reference', p_order_reference), NOW(), NOW());
  END IF;
  UPDATE public.payment_idempotency SET fulfillment_status = 'completed', error_message = NULL
  WHERE order_reference = p_order_reference;
  RETURN QUERY SELECT FALSE, TRUE, 'SUCCESS'::TEXT, v_credits, v_payment_id, v_subscription_id, v_new_balance;
END;
$$;

REVOKE ALL ON FUNCTION public.fulfill_ezonepay_payment_atomic_v2(TEXT, UUID, TEXT, NUMERIC, TEXT, TEXT, TEXT, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fulfill_ezonepay_payment_atomic_v2(TEXT, UUID, TEXT, NUMERIC, TEXT, TEXT, TEXT, TEXT)
  TO service_role;

COMMIT;
