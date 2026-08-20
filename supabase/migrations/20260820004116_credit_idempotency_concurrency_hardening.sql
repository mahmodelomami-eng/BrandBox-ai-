BEGIN;

CREATE OR REPLACE FUNCTION public.deduct_credits_idempotent(
  p_user_id UUID, p_amount INTEGER, p_description TEXT, p_reference_type TEXT, p_reference_id TEXT,
  p_idempotency_key TEXT DEFAULT NULL, p_actor_id UUID DEFAULT NULL)
RETURNS TABLE(success BOOLEAN, new_balance INTEGER, message TEXT, transaction_id TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_current_balance INTEGER; v_existing RECORD; v_tx_id TEXT; v_inserted INTEGER;
BEGIN
  IF p_user_id IS NULL OR p_amount <= 0 THEN RETURN QUERY SELECT FALSE, 0, 'INVALID_AMOUNT_OR_USER'::TEXT, NULL::TEXT; RETURN; END IF;
  SELECT credit_balance INTO v_current_balance FROM public.profiles WHERE id = p_user_id FOR UPDATE;
  IF v_current_balance IS NULL THEN RETURN QUERY SELECT FALSE, 0, 'USER_NOT_FOUND'::TEXT, NULL::TEXT; RETURN; END IF;
  IF p_idempotency_key IS NOT NULL THEN
    SELECT * INTO v_existing FROM public.credit_idempotency WHERE idempotency_key = p_idempotency_key;
    IF v_existing.idempotency_key IS NOT NULL THEN
      IF v_existing.user_id IS DISTINCT FROM p_user_id OR v_existing.action IS DISTINCT FROM 'deduct' OR v_existing.amount IS DISTINCT FROM p_amount
        THEN RAISE EXCEPTION 'IDEMPOTENCY_CONFLICT' USING ERRCODE = '23505'; END IF;
      RETURN QUERY SELECT TRUE, v_current_balance, 'IDEMPOTENT_DUPLICATE_SKIPPED'::TEXT, v_existing.transaction_id; RETURN;
    END IF;
  END IF;
  IF v_current_balance < p_amount THEN RETURN QUERY SELECT FALSE, v_current_balance, 'INSUFFICIENT_CREDITS'::TEXT, NULL::TEXT; RETURN; END IF;
  v_tx_id := 'tx_' || gen_random_uuid()::text;
  IF p_idempotency_key IS NOT NULL THEN
    INSERT INTO public.credit_idempotency (idempotency_key, user_id, action, amount, transaction_id)
    VALUES (p_idempotency_key, p_user_id, 'deduct', p_amount, v_tx_id) ON CONFLICT (idempotency_key) DO NOTHING;
    GET DIAGNOSTICS v_inserted = ROW_COUNT;
    IF v_inserted = 0 THEN
      SELECT * INTO v_existing FROM public.credit_idempotency WHERE idempotency_key = p_idempotency_key;
      IF v_existing.user_id IS DISTINCT FROM p_user_id OR v_existing.action IS DISTINCT FROM 'deduct' OR v_existing.amount IS DISTINCT FROM p_amount
        THEN RAISE EXCEPTION 'IDEMPOTENCY_CONFLICT' USING ERRCODE = '23505'; END IF;
      RETURN QUERY SELECT TRUE, v_current_balance, 'IDEMPOTENT_DUPLICATE_SKIPPED'::TEXT, v_existing.transaction_id; RETURN;
    END IF;
  END IF;
  UPDATE public.profiles SET credit_balance = credit_balance - p_amount, updated_at = NOW() WHERE id = p_user_id;
  INSERT INTO public.credit_transactions (id, user_id, amount, transaction_type, description, reference_type, reference_id, actor_id, idempotency_key)
  VALUES (v_tx_id, p_user_id, -p_amount, 'deduction', p_description, p_reference_type, p_reference_id, COALESCE(p_actor_id, p_user_id), p_idempotency_key);
  RETURN QUERY SELECT TRUE, (v_current_balance - p_amount), 'SUCCESS'::TEXT, v_tx_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.refund_credits_idempotent(
  p_user_id UUID, p_amount INTEGER, p_description TEXT, p_reference_type TEXT, p_reference_id TEXT,
  p_idempotency_key TEXT DEFAULT NULL, p_actor_id UUID DEFAULT NULL)
RETURNS TABLE(success BOOLEAN, new_balance INTEGER, message TEXT, transaction_id TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_current_balance INTEGER; v_existing RECORD; v_tx_id TEXT; v_inserted INTEGER;
BEGIN
  IF p_user_id IS NULL OR p_amount <= 0 THEN RETURN QUERY SELECT FALSE, 0, 'INVALID_AMOUNT_OR_USER'::TEXT, NULL::TEXT; RETURN; END IF;
  SELECT credit_balance INTO v_current_balance FROM public.profiles WHERE id = p_user_id FOR UPDATE;
  IF v_current_balance IS NULL THEN RETURN QUERY SELECT FALSE, 0, 'USER_NOT_FOUND'::TEXT, NULL::TEXT; RETURN; END IF;
  IF p_idempotency_key IS NOT NULL THEN
    SELECT * INTO v_existing FROM public.credit_idempotency WHERE idempotency_key = p_idempotency_key;
    IF v_existing.idempotency_key IS NOT NULL THEN
      IF v_existing.user_id IS DISTINCT FROM p_user_id OR v_existing.action IS DISTINCT FROM 'refund' OR v_existing.amount IS DISTINCT FROM p_amount
        THEN RAISE EXCEPTION 'IDEMPOTENCY_CONFLICT' USING ERRCODE = '23505'; END IF;
      RETURN QUERY SELECT TRUE, v_current_balance, 'IDEMPOTENT_DUPLICATE_SKIPPED'::TEXT, v_existing.transaction_id; RETURN;
    END IF;
  END IF;
  v_tx_id := 'tx_' || gen_random_uuid()::text;
  IF p_idempotency_key IS NOT NULL THEN
    INSERT INTO public.credit_idempotency (idempotency_key, user_id, action, amount, transaction_id)
    VALUES (p_idempotency_key, p_user_id, 'refund', p_amount, v_tx_id) ON CONFLICT (idempotency_key) DO NOTHING;
    GET DIAGNOSTICS v_inserted = ROW_COUNT;
    IF v_inserted = 0 THEN
      SELECT * INTO v_existing FROM public.credit_idempotency WHERE idempotency_key = p_idempotency_key;
      IF v_existing.user_id IS DISTINCT FROM p_user_id OR v_existing.action IS DISTINCT FROM 'refund' OR v_existing.amount IS DISTINCT FROM p_amount
        THEN RAISE EXCEPTION 'IDEMPOTENCY_CONFLICT' USING ERRCODE = '23505'; END IF;
      RETURN QUERY SELECT TRUE, v_current_balance, 'IDEMPOTENT_DUPLICATE_SKIPPED'::TEXT, v_existing.transaction_id; RETURN;
    END IF;
  END IF;
  UPDATE public.profiles SET credit_balance = credit_balance + p_amount, updated_at = NOW() WHERE id = p_user_id;
  INSERT INTO public.credit_transactions (id, user_id, amount, transaction_type, description, reference_type, reference_id, actor_id, idempotency_key)
  VALUES (v_tx_id, p_user_id, p_amount, 'refund', p_description, p_reference_type, p_reference_id, COALESCE(p_actor_id, p_user_id), p_idempotency_key);
  RETURN QUERY SELECT TRUE, (v_current_balance + p_amount), 'SUCCESS'::TEXT, v_tx_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.grant_credits_idempotent(
  p_user_id UUID, p_amount INTEGER, p_description TEXT, p_reference_type TEXT, p_reference_id TEXT,
  p_idempotency_key TEXT, p_actor_id UUID DEFAULT NULL, p_tx_type TEXT DEFAULT 'grant')
RETURNS TABLE(success BOOLEAN, new_balance INTEGER, message TEXT, transaction_id TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_current_balance INTEGER; v_existing RECORD; v_tx_id TEXT; v_inserted INTEGER;
BEGIN
  IF p_user_id IS NULL OR p_amount <= 0 OR p_idempotency_key IS NULL OR btrim(p_idempotency_key) = ''
    THEN RETURN QUERY SELECT FALSE, 0, 'INVALID_INPUT'::TEXT, NULL::TEXT; RETURN; END IF;
  IF p_tx_type NOT IN ('grant','subscription','purchase','admin_adjustment')
    THEN RETURN QUERY SELECT FALSE, 0, 'INVALID_TRANSACTION_TYPE'::TEXT, NULL::TEXT; RETURN; END IF;
  SELECT credit_balance INTO v_current_balance FROM public.profiles WHERE id = p_user_id FOR UPDATE;
  IF v_current_balance IS NULL THEN RETURN QUERY SELECT FALSE, 0, 'USER_NOT_FOUND'::TEXT, NULL::TEXT; RETURN; END IF;
  SELECT * INTO v_existing FROM public.credit_idempotency WHERE idempotency_key = p_idempotency_key;
  IF v_existing.idempotency_key IS NOT NULL THEN
    IF v_existing.user_id IS DISTINCT FROM p_user_id OR v_existing.action IS DISTINCT FROM ('grant:' || p_tx_type) OR v_existing.amount IS DISTINCT FROM p_amount
      THEN RAISE EXCEPTION 'IDEMPOTENCY_CONFLICT' USING ERRCODE = '23505'; END IF;
    RETURN QUERY SELECT TRUE, v_current_balance, 'IDEMPOTENT_DUPLICATE_SKIPPED'::TEXT, v_existing.transaction_id; RETURN;
  END IF;
  v_tx_id := 'tx_' || gen_random_uuid()::text;
  INSERT INTO public.credit_idempotency (idempotency_key, user_id, action, amount, transaction_id)
  VALUES (p_idempotency_key, p_user_id, 'grant:' || p_tx_type, p_amount, v_tx_id) ON CONFLICT (idempotency_key) DO NOTHING;
  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  IF v_inserted = 0 THEN
    SELECT * INTO v_existing FROM public.credit_idempotency WHERE idempotency_key = p_idempotency_key;
    IF v_existing.user_id IS DISTINCT FROM p_user_id OR v_existing.action IS DISTINCT FROM ('grant:' || p_tx_type) OR v_existing.amount IS DISTINCT FROM p_amount
      THEN RAISE EXCEPTION 'IDEMPOTENCY_CONFLICT' USING ERRCODE = '23505'; END IF;
    RETURN QUERY SELECT TRUE, v_current_balance, 'IDEMPOTENT_DUPLICATE_SKIPPED'::TEXT, v_existing.transaction_id; RETURN;
  END IF;
  UPDATE public.profiles SET credit_balance = credit_balance + p_amount, updated_at = NOW() WHERE id = p_user_id;
  INSERT INTO public.credit_transactions (id, user_id, amount, transaction_type, description, reference_type, reference_id, actor_id, idempotency_key)
  VALUES (v_tx_id, p_user_id, p_amount, p_tx_type, p_description, p_reference_type, p_reference_id, COALESCE(p_actor_id, p_user_id), p_idempotency_key);
  RETURN QUERY SELECT TRUE, (v_current_balance + p_amount), 'SUCCESS'::TEXT, v_tx_id;
END;
$$;

REVOKE ALL ON FUNCTION public.deduct_credits_idempotent(UUID, INTEGER, TEXT, TEXT, TEXT, TEXT, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.refund_credits_idempotent(UUID, INTEGER, TEXT, TEXT, TEXT, TEXT, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.grant_credits_idempotent(UUID, INTEGER, TEXT, TEXT, TEXT, TEXT, UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.deduct_credits_idempotent(UUID, INTEGER, TEXT, TEXT, TEXT, TEXT, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.refund_credits_idempotent(UUID, INTEGER, TEXT, TEXT, TEXT, TEXT, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.grant_credits_idempotent(UUID, INTEGER, TEXT, TEXT, TEXT, TEXT, UUID, TEXT) TO service_role;

COMMIT;
