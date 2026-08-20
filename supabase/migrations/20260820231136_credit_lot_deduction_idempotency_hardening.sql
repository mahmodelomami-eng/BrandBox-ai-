BEGIN;

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
      IF v_existing.user_id IS DISTINCT FROM p_user_id OR v_existing.action IS DISTINCT FROM 'deduct'
        OR v_existing.amount IS DISTINCT FROM p_amount
        OR (v_existing.transaction_type IS NOT NULL AND v_existing.transaction_type IS DISTINCT FROM 'deduction')
      THEN RAISE EXCEPTION 'IDEMPOTENCY_CONFLICT' USING ERRCODE='23505'; END IF;
      RETURN QUERY SELECT TRUE,v_balance,'IDEMPOTENT_DUPLICATE_SKIPPED'::TEXT,v_existing.transaction_id; RETURN;
    END IF;
  END IF;
  IF v_balance<p_amount THEN RETURN QUERY SELECT FALSE,v_balance,'INSUFFICIENT_CREDITS'::TEXT,NULL::TEXT; RETURN; END IF;
  v_tx_id := 'tx_'||gen_random_uuid()::text;
  IF p_idempotency_key IS NOT NULL THEN
    INSERT INTO public.credit_idempotency(idempotency_key,user_id,action,amount,transaction_id,transaction_type)
    VALUES(p_idempotency_key,p_user_id,'deduct',p_amount,v_tx_id,'deduction') ON CONFLICT(idempotency_key) DO NOTHING;
    GET DIAGNOSTICS v_inserted=ROW_COUNT;
    IF v_inserted=0 THEN
      SELECT * INTO v_existing FROM public.credit_idempotency WHERE idempotency_key=p_idempotency_key;
      IF v_existing.user_id IS DISTINCT FROM p_user_id OR v_existing.action IS DISTINCT FROM 'deduct'
        OR v_existing.amount IS DISTINCT FROM p_amount
        OR (v_existing.transaction_type IS NOT NULL AND v_existing.transaction_type IS DISTINCT FROM 'deduction')
      THEN RAISE EXCEPTION 'IDEMPOTENCY_CONFLICT' USING ERRCODE='23505'; END IF;
      RETURN QUERY SELECT TRUE,v_balance,'IDEMPOTENT_DUPLICATE_SKIPPED'::TEXT,v_existing.transaction_id; RETURN;
    END IF;
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
