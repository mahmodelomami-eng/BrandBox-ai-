BEGIN;

ALTER TABLE public.credit_packages
  ADD COLUMN IF NOT EXISTS purchased_credits INTEGER,
  ADD COLUMN IF NOT EXISTS bonus_credits INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bonus_valid_days INTEGER NOT NULL DEFAULT 90,
  ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

UPDATE public.credit_packages
SET purchased_credits = GREATEST(credits - bonus_credits, 1)
WHERE purchased_credits IS NULL;

ALTER TABLE public.credit_packages ALTER COLUMN purchased_credits SET NOT NULL;
ALTER TABLE public.credit_packages
  DROP CONSTRAINT IF EXISTS credit_packages_bonus_limit,
  ADD CONSTRAINT credit_packages_bonus_limit CHECK (bonus_credits >= 0 AND bonus_credits * 5 <= purchased_credits),
  DROP CONSTRAINT IF EXISTS credit_packages_credit_total,
  ADD CONSTRAINT credit_packages_credit_total CHECK (credits = purchased_credits + bonus_credits),
  DROP CONSTRAINT IF EXISTS credit_packages_bonus_valid_days_check,
  ADD CONSTRAINT credit_packages_bonus_valid_days_check CHECK (bonus_valid_days BETWEEN 1 AND 365);

INSERT INTO public.credit_packages
  (id, name, purchased_credits, bonus_credits, credits, price_lyd, bonus_valid_days, is_featured, sort_order, is_active)
VALUES
  ('pkg_100',  'باقة 100 نقطة',   100, 0,    100,  10, 90, FALSE, 10, TRUE),
  ('pkg_260',  'باقة 260 نقطة',   250, 10,   260,  25, 90, FALSE, 20, TRUE),
  ('pkg_550',  'باقة 550 نقطة',   500, 50,   550,  50, 90, FALSE, 30, TRUE),
  ('pkg_1150', 'الباقة الاحترافية', 1000, 150, 1150, 100, 90, TRUE, 40, TRUE),
  ('pkg_3000', 'باقة 3,000 نقطة', 2500, 500, 3000, 250, 90, FALSE, 50, TRUE),
  ('pkg_6000', 'باقة 6,000 نقطة', 5000, 1000,6000, 500, 90, FALSE, 60, TRUE)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, purchased_credits = EXCLUDED.purchased_credits,
  bonus_credits = EXCLUDED.bonus_credits, credits = EXCLUDED.credits,
  price_lyd = EXCLUDED.price_lyd, bonus_valid_days = EXCLUDED.bonus_valid_days,
  is_featured = EXCLUDED.is_featured, sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active, updated_at = NOW();

UPDATE public.credit_packages SET is_active = FALSE
WHERE id NOT IN ('pkg_100','pkg_260','pkg_550','pkg_1150','pkg_3000','pkg_6000');

CREATE TABLE IF NOT EXISTS public.credit_lots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL CHECK (source_type IN ('purchase','bonus')),
  original_amount INTEGER NOT NULL CHECK (original_amount > 0),
  remaining_amount INTEGER NOT NULL CHECK (remaining_amount >= 0),
  expires_at TIMESTAMPTZ,
  order_reference TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT credit_lots_expiry_rule CHECK (
    (source_type = 'purchase' AND expires_at IS NULL) OR
    (source_type = 'bonus' AND expires_at IS NOT NULL)
  ),
  UNIQUE(order_reference, source_type)
);
CREATE INDEX IF NOT EXISTS idx_credit_lots_consumption
  ON public.credit_lots(user_id, source_type, expires_at, created_at)
  WHERE remaining_amount > 0;
ALTER TABLE public.credit_lots ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.credit_lots FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.credit_lots TO service_role;

CREATE OR REPLACE FUNCTION public.fulfill_ezonepay_payment_atomic_v2(
  p_order_reference TEXT, p_user_id UUID, p_provider_tx_id TEXT, p_amount_lyd NUMERIC,
  p_currency TEXT, p_item_type TEXT, p_item_id TEXT, p_payload_hash TEXT)
RETURNS TABLE(already_processed BOOLEAN, success BOOLEAN, message TEXT, credits_granted INTEGER,
  payment_id TEXT, subscription_id TEXT, new_balance INTEGER)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_expected_amount NUMERIC(12,2); v_credits INTEGER; v_purchased INTEGER; v_bonus INTEGER;
  v_bonus_days INTEGER; v_payment_id TEXT; v_subscription_id TEXT; v_new_balance INTEGER;
  v_inserted INTEGER; v_existing RECORD;
BEGIN
  IF p_order_reference IS NULL OR btrim(p_order_reference) = '' OR p_user_id IS NULL
    OR p_provider_tx_id IS NULL OR btrim(p_provider_tx_id) = '' OR p_amount_lyd IS NULL OR p_amount_lyd <= 0
    OR p_payload_hash IS NULL OR btrim(p_payload_hash) = '' OR p_item_id IS NULL OR btrim(p_item_id) = ''
  THEN RAISE EXCEPTION 'INVALID_PAYMENT_INPUT' USING ERRCODE = '22023'; END IF;
  IF upper(COALESCE(p_currency,'')) <> 'LYD' THEN RAISE EXCEPTION 'UNSUPPORTED_CURRENCY' USING ERRCODE = '22023'; END IF;

  IF p_item_type = 'purchase' THEN
    SELECT cp.price_lyd, cp.credits, cp.purchased_credits, cp.bonus_credits, cp.bonus_valid_days
      INTO v_expected_amount, v_credits, v_purchased, v_bonus, v_bonus_days
    FROM public.credit_packages cp WHERE cp.id = p_item_id AND cp.is_active = TRUE;
  ELSIF p_item_type = 'subscription' THEN
    SELECT pl.price_monthly_lyd, pl.monthly_credits, pl.monthly_credits, 0, 90
      INTO v_expected_amount, v_credits, v_purchased, v_bonus, v_bonus_days
    FROM public.plans pl WHERE pl.id = p_item_id AND pl.is_active = TRUE;
  ELSE RAISE EXCEPTION 'INVALID_ITEM_TYPE' USING ERRCODE = '22023'; END IF;
  IF v_expected_amount IS NULL OR v_credits IS NULL THEN RAISE EXCEPTION 'INVALID_OR_INACTIVE_ITEM' USING ERRCODE = '22023'; END IF;
  IF round(p_amount_lyd::numeric,2) <> round(v_expected_amount::numeric,2) THEN RAISE EXCEPTION 'PAYMENT_AMOUNT_MISMATCH' USING ERRCODE = '22023'; END IF;

  PERFORM 1 FROM public.profiles WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'PROFILE_NOT_FOUND' USING ERRCODE = 'P0002'; END IF;
  INSERT INTO public.payment_idempotency(order_reference,user_id,status,provider_tx_id,item_type,amount_lyd,payload_hash,processed_at,fulfillment_status,error_message)
  VALUES(p_order_reference,p_user_id,'processed',p_provider_tx_id,p_item_type,p_amount_lyd,p_payload_hash,NOW(),'pending',NULL)
  ON CONFLICT(order_reference) DO NOTHING;
  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  IF v_inserted = 0 THEN
    SELECT * INTO v_existing FROM public.payment_idempotency WHERE order_reference=p_order_reference;
    IF v_existing.user_id IS DISTINCT FROM p_user_id OR v_existing.provider_tx_id IS DISTINCT FROM p_provider_tx_id
      OR v_existing.payload_hash IS DISTINCT FROM p_payload_hash OR v_existing.item_type IS DISTINCT FROM p_item_type
      OR round(v_existing.amount_lyd::numeric,2) IS DISTINCT FROM round(p_amount_lyd::numeric,2)
    THEN RAISE EXCEPTION 'IDEMPOTENCY_CONFLICT' USING ERRCODE='23505'; END IF;
    IF v_existing.fulfillment_status='completed' THEN
      SELECT pt.id INTO v_payment_id FROM public.payment_transactions pt WHERE pt.order_reference=p_order_reference;
      RETURN QUERY SELECT TRUE,TRUE,'IDEMPOTENT_DUPLICATE_SKIPPED'::TEXT,v_credits,v_payment_id,NULL::TEXT,
        (SELECT credit_balance FROM public.profiles WHERE id=p_user_id); RETURN;
    END IF;
    RAISE EXCEPTION 'PAYMENT_ALREADY_IN_PROGRESS' USING ERRCODE='55000';
  END IF;

  INSERT INTO public.payment_transactions(order_reference,user_id,provider,provider_tx_id,amount_lyd,currency,status,item_type,metadata,created_at,updated_at)
  VALUES(p_order_reference,p_user_id,'Ezone Pay',p_provider_tx_id,p_amount_lyd,'LYD','paid',p_item_type,
    jsonb_build_object('item_id',p_item_id,'purchased_credits',v_purchased,'bonus_credits',v_bonus),NOW(),NOW()) RETURNING id INTO v_payment_id;
  UPDATE public.profiles SET credit_balance=credit_balance+v_credits,updated_at=NOW() WHERE id=p_user_id RETURNING credit_balance INTO v_new_balance;
  INSERT INTO public.credit_lots(user_id,source_type,original_amount,remaining_amount,expires_at,order_reference)
    VALUES(p_user_id,'purchase',v_purchased,v_purchased,NULL,p_order_reference);
  IF v_bonus > 0 THEN
    INSERT INTO public.credit_lots(user_id,source_type,original_amount,remaining_amount,expires_at,order_reference)
      VALUES(p_user_id,'bonus',v_bonus,v_bonus,NOW()+make_interval(days=>v_bonus_days),p_order_reference);
  END IF;
  INSERT INTO public.credit_transactions(user_id,amount,transaction_type,description,reference_type,reference_id,actor_id,idempotency_key)
  VALUES(p_user_id,v_credits,p_item_type,'Ezone Pay credit purchase ('||p_order_reference||')',p_item_type,p_order_reference,p_user_id,'payment:'||p_order_reference);
  IF p_item_type='subscription' THEN
    v_subscription_id := 'sub_'||gen_random_uuid()::text;
    INSERT INTO public.subscriptions(id,user_id,plan_id,status,provider,external_subscription_id,current_period_start,current_period_end,auto_renew,metadata,created_at,updated_at)
    VALUES(v_subscription_id,p_user_id,p_item_id,'active','Ezone Pay',p_provider_tx_id,NOW(),NOW()+INTERVAL '30 days',TRUE,jsonb_build_object('order_reference',p_order_reference),NOW(),NOW());
  END IF;
  UPDATE public.payment_idempotency SET fulfillment_status='completed',error_message=NULL WHERE order_reference=p_order_reference;
  RETURN QUERY SELECT FALSE,TRUE,'SUCCESS'::TEXT,v_credits,v_payment_id,v_subscription_id,v_new_balance;
END; $$;

REVOKE ALL ON FUNCTION public.fulfill_ezonepay_payment_atomic_v2(TEXT,UUID,TEXT,NUMERIC,TEXT,TEXT,TEXT,TEXT) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.fulfill_ezonepay_payment_atomic_v2(TEXT,UUID,TEXT,NUMERIC,TEXT,TEXT,TEXT,TEXT) TO service_role;

CREATE OR REPLACE FUNCTION public.deduct_credits_idempotent(
  p_user_id UUID, p_amount INTEGER, p_description TEXT, p_reference_type TEXT, p_reference_id TEXT,
  p_idempotency_key TEXT DEFAULT NULL, p_actor_id UUID DEFAULT NULL)
RETURNS TABLE(success BOOLEAN, new_balance INTEGER, message TEXT, transaction_id TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_balance INTEGER; v_expired INTEGER; v_to_consume INTEGER; v_take INTEGER;
  v_existing RECORD; v_lot RECORD; v_tx_id TEXT; v_inserted INTEGER;
BEGIN
  IF p_user_id IS NULL OR p_amount <= 0 THEN RETURN QUERY SELECT FALSE,0,'INVALID_AMOUNT_OR_USER'::TEXT,NULL::TEXT; RETURN; END IF;
  SELECT credit_balance INTO v_balance FROM public.profiles WHERE id=p_user_id FOR UPDATE;
  IF v_balance IS NULL THEN RETURN QUERY SELECT FALSE,0,'USER_NOT_FOUND'::TEXT,NULL::TEXT; RETURN; END IF;

  SELECT COALESCE(sum(remaining_amount),0)::INTEGER INTO v_expired FROM public.credit_lots
    WHERE user_id=p_user_id AND source_type='bonus' AND remaining_amount>0 AND expires_at<=NOW();
  IF v_expired>0 THEN
    UPDATE public.credit_lots SET remaining_amount=0 WHERE user_id=p_user_id AND source_type='bonus' AND remaining_amount>0 AND expires_at<=NOW();
    v_balance := GREATEST(v_balance-v_expired,0);
    UPDATE public.profiles SET credit_balance=v_balance,updated_at=NOW() WHERE id=p_user_id;
  END IF;

  IF p_idempotency_key IS NOT NULL THEN
    SELECT * INTO v_existing FROM public.credit_idempotency WHERE idempotency_key=p_idempotency_key;
    IF v_existing.idempotency_key IS NOT NULL THEN
      IF v_existing.user_id IS DISTINCT FROM p_user_id OR v_existing.action IS DISTINCT FROM 'deduct' OR v_existing.amount IS DISTINCT FROM p_amount
      THEN RAISE EXCEPTION 'IDEMPOTENCY_CONFLICT' USING ERRCODE='23505'; END IF;
      RETURN QUERY SELECT TRUE,v_balance,'IDEMPOTENT_DUPLICATE_SKIPPED'::TEXT,v_existing.transaction_id; RETURN;
    END IF;
  END IF;
  IF v_balance<p_amount THEN RETURN QUERY SELECT FALSE,v_balance,'INSUFFICIENT_CREDITS'::TEXT,NULL::TEXT; RETURN; END IF;
  v_tx_id := 'tx_'||gen_random_uuid()::text;
  IF p_idempotency_key IS NOT NULL THEN
    INSERT INTO public.credit_idempotency(idempotency_key,user_id,action,amount,transaction_id)
    VALUES(p_idempotency_key,p_user_id,'deduct',p_amount,v_tx_id) ON CONFLICT(idempotency_key) DO NOTHING;
    GET DIAGNOSTICS v_inserted=ROW_COUNT;
    IF v_inserted=0 THEN RETURN QUERY SELECT TRUE,v_balance,'IDEMPOTENT_DUPLICATE_SKIPPED'::TEXT,v_tx_id; RETURN; END IF;
  END IF;

  v_to_consume := p_amount;
  FOR v_lot IN SELECT id,remaining_amount FROM public.credit_lots
    WHERE user_id=p_user_id AND source_type='bonus' AND remaining_amount>0 AND expires_at>NOW()
    ORDER BY expires_at,created_at FOR UPDATE
  LOOP
    EXIT WHEN v_to_consume=0; v_take:=LEAST(v_lot.remaining_amount,v_to_consume);
    UPDATE public.credit_lots SET remaining_amount=remaining_amount-v_take WHERE id=v_lot.id; v_to_consume:=v_to_consume-v_take;
  END LOOP;
  FOR v_lot IN SELECT id,remaining_amount FROM public.credit_lots
    WHERE user_id=p_user_id AND source_type='purchase' AND remaining_amount>0
    ORDER BY created_at FOR UPDATE
  LOOP
    EXIT WHEN v_to_consume=0; v_take:=LEAST(v_lot.remaining_amount,v_to_consume);
    UPDATE public.credit_lots SET remaining_amount=remaining_amount-v_take WHERE id=v_lot.id; v_to_consume:=v_to_consume-v_take;
  END LOOP;
  UPDATE public.profiles SET credit_balance=credit_balance-p_amount,updated_at=NOW() WHERE id=p_user_id RETURNING credit_balance INTO v_balance;
  INSERT INTO public.credit_transactions(id,user_id,amount,transaction_type,description,reference_type,reference_id,actor_id,idempotency_key)
  VALUES(v_tx_id,p_user_id,-p_amount,'deduction',p_description,p_reference_type,p_reference_id,COALESCE(p_actor_id,p_user_id),p_idempotency_key);
  RETURN QUERY SELECT TRUE,v_balance,'SUCCESS'::TEXT,v_tx_id;
END; $$;
REVOKE ALL ON FUNCTION public.deduct_credits_idempotent(UUID,INTEGER,TEXT,TEXT,TEXT,TEXT,UUID) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.deduct_credits_idempotent(UUID,INTEGER,TEXT,TEXT,TEXT,TEXT,UUID) TO service_role;

COMMIT;
