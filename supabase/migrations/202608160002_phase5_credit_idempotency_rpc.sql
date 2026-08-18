BEGIN;

ALTER TABLE public.credit_transactions 
ADD COLUMN IF NOT EXISTS idempotency_key TEXT UNIQUE;

ALTER TABLE public.generations 
ADD COLUMN IF NOT EXISTS idempotency_key TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS credits_reserved INTEGER DEFAULT 0 NOT NULL;

CREATE TABLE IF NOT EXISTS public.credit_idempotency (
    idempotency_key TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    action TEXT CHECK (action IN ('deduct', 'grant', 'refund')) NOT NULL,
    amount INTEGER NOT NULL,
    transaction_id TEXT REFERENCES public.credit_transactions(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.credit_idempotency ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own credit idempotency" ON public.credit_idempotency;
CREATE POLICY "Users can read own credit idempotency" ON public.credit_idempotency
    FOR SELECT USING (auth.uid() = user_id OR public.get_user_role(auth.uid()) IN ('SUPER_ADMIN', 'ADMIN'));

CREATE OR REPLACE FUNCTION public.deduct_credits_idempotent(
    p_user_id UUID,
    p_amount INTEGER,
    p_description TEXT,
    p_reference_type TEXT,
    p_reference_id TEXT,
    p_idempotency_key TEXT DEFAULT NULL,
    p_actor_id UUID DEFAULT NULL
)
RETURNS TABLE (success BOOLEAN, new_balance INTEGER, message TEXT, transaction_id TEXT) AS $$
DECLARE
    v_current_balance INTEGER;
    v_existing_idemp RECORD;
    v_tx_id TEXT;
BEGIN
    IF p_amount <= 0 THEN
        RETURN QUERY SELECT FALSE, 0, 'INVALID_AMOUNT: Amount must be positive'::TEXT, NULL::TEXT;
        RETURN;
    END IF;

    IF p_idempotency_key IS NOT NULL THEN
        SELECT * INTO v_existing_idemp FROM public.credit_idempotency WHERE idempotency_key = p_idempotency_key;
        IF v_existing_idemp.idempotency_key IS NOT NULL THEN
            SELECT credit_balance INTO v_current_balance FROM public.profiles WHERE id = p_user_id;
            RETURN QUERY SELECT TRUE, COALESCE(v_current_balance, 0), 'IDEMPOTENT_DUPLICATE_SKIPPED'::TEXT, v_existing_idemp.transaction_id;
            RETURN;
        END IF;
    END IF;

    SELECT credit_balance INTO v_current_balance
    FROM public.profiles
    WHERE id = p_user_id
    FOR UPDATE;

    IF v_current_balance IS NULL THEN
        RETURN QUERY SELECT FALSE, 0, 'USER_NOT_FOUND'::TEXT, NULL::TEXT;
        RETURN;
    END IF;

    IF v_current_balance < p_amount THEN
        RETURN QUERY SELECT FALSE, v_current_balance, 'INSUFFICIENT_CREDITS'::TEXT, NULL::TEXT;
        RETURN;
    END IF;

    UPDATE public.profiles
    SET credit_balance = credit_balance - p_amount,
        updated_at = NOW()
    WHERE id = p_user_id;

    v_tx_id := 'tx_' || gen_random_uuid()::text;

    INSERT INTO public.credit_transactions (
        id, user_id, amount, transaction_type, description, reference_type, reference_id, actor_id, idempotency_key
    ) VALUES (
        v_tx_id, p_user_id, -p_amount, 'deduction', p_description, p_reference_type, p_reference_id, COALESCE(p_actor_id, p_user_id), p_idempotency_key
    );

    IF p_idempotency_key IS NOT NULL THEN
        INSERT INTO public.credit_idempotency (idempotency_key, user_id, action, amount, transaction_id)
        VALUES (p_idempotency_key, p_user_id, 'deduct', p_amount, v_tx_id)
        ON CONFLICT (idempotency_key) DO NOTHING;
    END IF;

    RETURN QUERY SELECT TRUE, (v_current_balance - p_amount), 'SUCCESS'::TEXT, v_tx_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.refund_credits_idempotent(
    p_user_id UUID,
    p_amount INTEGER,
    p_description TEXT,
    p_reference_type TEXT,
    p_reference_id TEXT,
    p_idempotency_key TEXT DEFAULT NULL,
    p_actor_id UUID DEFAULT NULL
)
RETURNS TABLE (success BOOLEAN, new_balance INTEGER, message TEXT, transaction_id TEXT) AS $$
DECLARE
    v_current_balance INTEGER;
    v_existing_idemp RECORD;
    v_tx_id TEXT;
BEGIN
    IF p_amount <= 0 THEN
        RETURN QUERY SELECT FALSE, 0, 'INVALID_AMOUNT: Amount must be positive'::TEXT, NULL::TEXT;
        RETURN;
    END IF;

    IF p_idempotency_key IS NOT NULL THEN
        SELECT * INTO v_existing_idemp FROM public.credit_idempotency WHERE idempotency_key = p_idempotency_key;
        IF v_existing_idemp.idempotency_key IS NOT NULL THEN
            SELECT credit_balance INTO v_current_balance FROM public.profiles WHERE id = p_user_id;
            RETURN QUERY SELECT TRUE, COALESCE(v_current_balance, 0), 'IDEMPOTENT_DUPLICATE_SKIPPED'::TEXT, v_existing_idemp.transaction_id;
            RETURN;
        END IF;
    END IF;

    SELECT credit_balance INTO v_current_balance
    FROM public.profiles
    WHERE id = p_user_id
    FOR UPDATE;

    IF v_current_balance IS NULL THEN
        RETURN QUERY SELECT FALSE, 0, 'USER_NOT_FOUND'::TEXT, NULL::TEXT;
        RETURN;
    END IF;

    UPDATE public.profiles
    SET credit_balance = credit_balance + p_amount,
        updated_at = NOW()
    WHERE id = p_user_id;

    v_tx_id := 'tx_' || gen_random_uuid()::text;

    INSERT INTO public.credit_transactions (
        id, user_id, amount, transaction_type, description, reference_type, reference_id, actor_id, idempotency_key
    ) VALUES (
        v_tx_id, p_user_id, p_amount, 'refund', p_description, p_reference_type, p_reference_id, COALESCE(p_actor_id, p_user_id), p_idempotency_key
    );

    IF p_idempotency_key IS NOT NULL THEN
        INSERT INTO public.credit_idempotency (idempotency_key, user_id, action, amount, transaction_id)
        VALUES (p_idempotency_key, p_user_id, 'refund', p_amount, v_tx_id)
        ON CONFLICT (idempotency_key) DO NOTHING;
    END IF;

    RETURN QUERY SELECT TRUE, (v_current_balance + p_amount), 'SUCCESS'::TEXT, v_tx_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMIT;