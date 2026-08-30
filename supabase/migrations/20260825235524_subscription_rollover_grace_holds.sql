-- Brand Box AI ظ¤ one-cycle subscription rollover with renewal grace holds
BEGIN;

CREATE TABLE IF NOT EXISTS public.credit_rollover_holds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  original_lot_id UUID NOT NULL UNIQUE REFERENCES public.credit_lots(id) ON DELETE CASCADE,
  plan_id TEXT REFERENCES public.plans(id) ON DELETE SET NULL,
  held_amount INTEGER NOT NULL CHECK (held_amount > 0),
  eligible_until TIMESTAMPTZ NOT NULL,
  restored_at TIMESTAMPTZ,
  restored_amount INTEGER CHECK (restored_amount IS NULL OR restored_amount >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_credit_rollover_holds_eligible
  ON public.credit_rollover_holds(user_id, eligible_until DESC)
  WHERE restored_at IS NULL;
ALTER TABLE public.credit_rollover_holds ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.credit_rollover_holds FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.credit_rollover_holds TO service_role;

CREATE OR REPLACE FUNCTION public.organize_subscription_credit_cycle()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_reference TEXT;
  v_monthly_credits INTEGER;
  v_rollover_enabled BOOLEAN;
  v_rollover_cap_pct INTEGER;
  v_rollover_max_cycles INTEGER;
  v_grace_days INTEGER;
  v_cap INTEGER;
  v_previous RECORD;
  v_hold RECORD;
  v_carry INTEGER := 0;
  v_remove INTEGER := 0;
  v_removed_old_rollover INTEGER := 0;
  v_removed_other_subscription INTEGER := 0;
BEGIN
  v_order_reference := NULLIF(NEW.metadata ->> 'order_reference', '');
  IF v_order_reference IS NULL THEN RETURN NEW; END IF;

  SELECT monthly_credits, rollover_enabled, rollover_cap_pct, rollover_max_cycles, renewal_grace_days
    INTO v_monthly_credits, v_rollover_enabled, v_rollover_cap_pct, v_rollover_max_cycles, v_grace_days
  FROM public.plans
  WHERE id = NEW.plan_id;

  IF v_monthly_credits IS NULL THEN RETURN NEW; END IF;

  PERFORM 1 FROM public.profiles WHERE id = NEW.user_id FOR UPDATE;

  UPDATE public.credit_lots
  SET source_type = 'subscription',
      expires_at = NEW.current_period_end,
      plan_id = NEW.plan_id,
      subscription_id = NEW.id,
      cycle_start = NEW.current_period_start,
      cycle_end = NEW.current_period_end,
      rollover_cycles = 0,
      metadata = metadata || jsonb_build_object('subscription_credit', TRUE)
  WHERE user_id = NEW.user_id
    AND order_reference = v_order_reference
    AND source_type = 'purchase';

  SELECT COALESCE(SUM(remaining_amount),0)::INTEGER
    INTO v_removed_old_rollover
  FROM public.credit_lots
  WHERE user_id = NEW.user_id
    AND source_type = 'rollover'
    AND remaining_amount > 0;

  IF v_removed_old_rollover > 0 THEN
    UPDATE public.credit_lots
    SET remaining_amount = 0,
        metadata = metadata || jsonb_build_object('expired_reason','rollover_cycle_limit')
    WHERE user_id = NEW.user_id
      AND source_type = 'rollover'
      AND remaining_amount > 0;
  END IF;

  IF v_rollover_enabled AND v_rollover_max_cycles = 1 THEN
    v_cap := FLOOR(v_monthly_credits * v_rollover_cap_pct / 100.0)::INTEGER;

    SELECT id, remaining_amount
      INTO v_previous
    FROM public.credit_lots
    WHERE user_id = NEW.user_id
      AND source_type = 'subscription'
      AND subscription_id IS DISTINCT FROM NEW.id
      AND remaining_amount > 0
      AND expires_at >= NEW.current_period_start
      AND cycle_start < NEW.current_period_start
    ORDER BY cycle_end DESC NULLS LAST, created_at DESC
    LIMIT 1
    FOR UPDATE;

    IF v_previous.id IS NOT NULL THEN
      v_carry := LEAST(v_previous.remaining_amount, GREATEST(v_cap,0));
      v_remove := GREATEST(v_previous.remaining_amount - v_carry, 0);
      UPDATE public.credit_lots
      SET source_type = 'rollover',
          remaining_amount = v_carry,
          expires_at = NEW.current_period_end,
          rollover_cycles = 1,
          metadata = metadata || jsonb_build_object(
            'rolled_into_subscription_id', NEW.id,
            'rollover_amount', v_carry,
            'rollover_cap', v_cap
          )
      WHERE id = v_previous.id;
    ELSE
      SELECT id, held_amount
        INTO v_hold
      FROM public.credit_rollover_holds
      WHERE user_id = NEW.user_id
        AND restored_at IS NULL
        AND eligible_until >= NEW.current_period_start
      ORDER BY eligible_until DESC, created_at DESC
      LIMIT 1
      FOR UPDATE;

      IF v_hold.id IS NOT NULL THEN
        v_carry := LEAST(v_hold.held_amount, GREATEST(v_cap,0));
        UPDATE public.credit_rollover_holds
        SET restored_at = NOW(), restored_amount = v_carry
        WHERE id = v_hold.id;

        IF v_carry > 0 THEN
          INSERT INTO public.credit_lots(
            user_id, source_type, original_amount, remaining_amount, expires_at,
            order_reference, plan_id, subscription_id, cycle_start, cycle_end,
            rollover_cycles, metadata
          ) VALUES (
            NEW.user_id, 'rollover', v_carry, v_carry, NEW.current_period_end,
            v_order_reference || ':rollover', NEW.plan_id, NEW.id,
            NEW.current_period_start, NEW.current_period_end, 1,
            jsonb_build_object('restored_from_hold_id', v_hold.id, 'rollover_cap', v_cap)
          );
          UPDATE public.profiles
          SET credit_balance = credit_balance + v_carry, updated_at = NOW()
          WHERE id = NEW.user_id;
        END IF;
      END IF;
    END IF;
  END IF;

  SELECT COALESCE(SUM(remaining_amount),0)::INTEGER
    INTO v_removed_other_subscription
  FROM public.credit_lots
  WHERE user_id = NEW.user_id
    AND source_type = 'subscription'
    AND subscription_id IS DISTINCT FROM NEW.id
    AND remaining_amount > 0
    AND (v_previous.id IS NULL OR id <> v_previous.id);

  IF v_removed_other_subscription > 0 THEN
    UPDATE public.credit_lots
    SET remaining_amount = 0,
        metadata = metadata || jsonb_build_object('expired_reason','subscription_cycle_ended')
    WHERE user_id = NEW.user_id
      AND source_type = 'subscription'
      AND subscription_id IS DISTINCT FROM NEW.id
      AND remaining_amount > 0
      AND (v_previous.id IS NULL OR id <> v_previous.id);
  END IF;

  IF (v_removed_old_rollover + v_remove + v_removed_other_subscription) > 0 THEN
    UPDATE public.profiles
    SET credit_balance = GREATEST(
          credit_balance - (v_removed_old_rollover + v_remove + v_removed_other_subscription), 0
        ),
        updated_at = NOW()
    WHERE id = NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.organize_subscription_credit_cycle() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.organize_subscription_credit_cycle() TO service_role;

CREATE OR REPLACE FUNCTION public.deduct_credits_idempotent(
  p_user_id UUID, p_amount INTEGER, p_description TEXT, p_reference_type TEXT, p_reference_id TEXT,
  p_idempotency_key TEXT DEFAULT NULL, p_actor_id UUID DEFAULT NULL)
RETURNS TABLE(success BOOLEAN, new_balance INTEGER, message TEXT, transaction_id TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_balance INTEGER; v_expired INTEGER; v_to_consume INTEGER; v_take INTEGER;
  v_existing RECORD; v_lot RECORD; v_tx_id TEXT; v_inserted INTEGER;
BEGIN
  IF p_user_id IS NULL OR p_amount <= 0 THEN
    RETURN QUERY SELECT FALSE,0,'INVALID_AMOUNT_OR_USER'::TEXT,NULL::TEXT; RETURN;
  END IF;

  SELECT credit_balance INTO v_balance FROM public.profiles WHERE id=p_user_id FOR UPDATE;
  IF v_balance IS NULL THEN
    RETURN QUERY SELECT FALSE,0,'USER_NOT_FOUND'::TEXT,NULL::TEXT; RETURN;
  END IF;

  INSERT INTO public.credit_rollover_holds(user_id, original_lot_id, plan_id, held_amount, eligible_until)
  SELECT cl.user_id, cl.id, cl.plan_id, cl.remaining_amount,
         cl.expires_at + make_interval(days => COALESCE(pl.renewal_grace_days,0))
  FROM public.credit_lots cl
  LEFT JOIN public.plans pl ON pl.id = cl.plan_id
  WHERE cl.user_id = p_user_id
    AND cl.source_type = 'subscription'
    AND cl.remaining_amount > 0
    AND cl.expires_at <= NOW()
    AND COALESCE(pl.rollover_enabled,FALSE) = TRUE
    AND COALESCE(pl.renewal_grace_days,0) > 0
  ON CONFLICT (original_lot_id) DO NOTHING;

  SELECT COALESCE(SUM(remaining_amount),0)::INTEGER INTO v_expired
  FROM public.credit_lots
  WHERE user_id=p_user_id
    AND source_type IN ('bonus','subscription','rollover')
    AND remaining_amount>0
    AND expires_at<=NOW();

  IF v_expired>0 THEN
    UPDATE public.credit_lots
    SET remaining_amount=0,
        metadata = metadata || jsonb_build_object('expired_reason','expiry_date')
    WHERE user_id=p_user_id
      AND source_type IN ('bonus','subscription','rollover')
      AND remaining_amount>0
      AND expires_at<=NOW();
    v_balance := GREATEST(v_balance-v_expired,0);
    UPDATE public.profiles SET credit_balance=v_balance,updated_at=NOW() WHERE id=p_user_id;
  END IF;

  IF p_idempotency_key IS NOT NULL THEN
    SELECT * INTO v_existing FROM public.credit_idempotency WHERE idempotency_key=p_idempotency_key;
    IF v_existing.idempotency_key IS NOT NULL THEN
      IF v_existing.user_id IS DISTINCT FROM p_user_id
         OR v_existing.action IS DISTINCT FROM 'deduct'
         OR v_existing.amount IS DISTINCT FROM p_amount
      THEN RAISE EXCEPTION 'IDEMPOTENCY_CONFLICT' USING ERRCODE='23505'; END IF;
      RETURN QUERY SELECT TRUE,v_balance,'IDEMPOTENT_DUPLICATE_SKIPPED'::TEXT,v_existing.transaction_id; RETURN;
    END IF;
  END IF;

  IF v_balance<p_amount THEN
    RETURN QUERY SELECT FALSE,v_balance,'INSUFFICIENT_CREDITS'::TEXT,NULL::TEXT; RETURN;
  END IF;

  v_tx_id := 'tx_'||gen_random_uuid()::text;
  IF p_idempotency_key IS NOT NULL THEN
    INSERT INTO public.credit_idempotency(idempotency_key,user_id,action,amount,transaction_id)
    VALUES(p_idempotency_key,p_user_id,'deduct',p_amount,v_tx_id)
    ON CONFLICT(idempotency_key) DO NOTHING;
    GET DIAGNOSTICS v_inserted=ROW_COUNT;
    IF v_inserted=0 THEN
      RETURN QUERY SELECT TRUE,v_balance,'IDEMPOTENT_DUPLICATE_SKIPPED'::TEXT,v_tx_id; RETURN;
    END IF;
  END IF;

  v_to_consume := p_amount;
  FOR v_lot IN
    SELECT id,remaining_amount
    FROM public.credit_lots
    WHERE user_id=p_user_id
      AND source_type IN ('bonus','subscription','rollover')
      AND remaining_amount>0
      AND expires_at>NOW()
    ORDER BY expires_at,
      CASE source_type WHEN 'rollover' THEN 1 WHEN 'bonus' THEN 2 ELSE 3 END,
      created_at
    FOR UPDATE
  LOOP
    EXIT WHEN v_to_consume=0;
    v_take:=LEAST(v_lot.remaining_amount,v_to_consume);
    UPDATE public.credit_lots SET remaining_amount=remaining_amount-v_take WHERE id=v_lot.id;
    v_to_consume:=v_to_consume-v_take;
  END LOOP;

  FOR v_lot IN
    SELECT id,remaining_amount
    FROM public.credit_lots
    WHERE user_id=p_user_id AND source_type='purchase' AND remaining_amount>0
    ORDER BY created_at
    FOR UPDATE
  LOOP
    EXIT WHEN v_to_consume=0;
    v_take:=LEAST(v_lot.remaining_amount,v_to_consume);
    UPDATE public.credit_lots SET remaining_amount=remaining_amount-v_take WHERE id=v_lot.id;
    v_to_consume:=v_to_consume-v_take;
  END LOOP;

  UPDATE public.profiles
  SET credit_balance=credit_balance-p_amount,updated_at=NOW()
  WHERE id=p_user_id
  RETURNING credit_balance INTO v_balance;

  INSERT INTO public.credit_transactions(
    id,user_id,amount,transaction_type,description,reference_type,reference_id,actor_id,idempotency_key
  ) VALUES(
    v_tx_id,p_user_id,-p_amount,'deduction',p_description,p_reference_type,p_reference_id,
    COALESCE(p_actor_id,p_user_id),p_idempotency_key
  );

  RETURN QUERY SELECT TRUE,v_balance,'SUCCESS'::TEXT,v_tx_id;
END; $$;
REVOKE ALL ON FUNCTION public.deduct_credits_idempotent(UUID,INTEGER,TEXT,TEXT,TEXT,TEXT,UUID) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.deduct_credits_idempotent(UUID,INTEGER,TEXT,TEXT,TEXT,TEXT,UUID) TO service_role;

COMMIT;
