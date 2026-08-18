BEGIN;

ALTER TABLE public.payment_idempotency
ADD COLUMN IF NOT EXISTS provider_tx_id TEXT,
ADD COLUMN IF NOT EXISTS item_type TEXT CHECK (item_type IN ('subscription', 'purchase')),
ADD COLUMN IF NOT EXISTS amount_lyd NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS fulfillment_status TEXT DEFAULT 'completed' CHECK (fulfillment_status IN ('pending', 'completed', 'failed')),
ADD COLUMN IF NOT EXISTS error_message TEXT;

CREATE OR REPLACE FUNCTION public.fulfill_ezonepay_payment_atomic(
    p_order_reference TEXT,
    p_user_id UUID,
    p_provider_tx_id TEXT,
    p_amount_lyd NUMERIC(10, 2),
    p_item_type TEXT,
    p_payload_hash TEXT
)
RETURNS TABLE (already_processed BOOLEAN, success BOOLEAN, message TEXT) AS $$
DECLARE
    v_existingRECORD RECORD;
BEGIN
    SELECT order_reference, status INTO v_existingRECORD
    FROM public.payment_idempotency
    WHERE order_reference = p_order_reference;

    IF v_existingRECORD.order_reference IS NOT NULL THEN
        RETURN QUERY SELECT TRUE, TRUE, 'IDEMPOTENT_DUPLICATE_SKIPPED'::TEXT;
        RETURN;
    END IF;

    INSERT INTO public.payment_idempotency (
        order_reference, user_id, status, provider_tx_id, item_type, amount_lyd, payload_hash, processed_at
    ) VALUES (
        p_order_reference, p_user_id, 'processed', p_provider_tx_id, p_item_type, p_amount_lyd, p_payload_hash, NOW()
    );

    INSERT INTO public.payment_transactions (
        order_reference, user_id, provider, provider_tx_id, amount_lyd, currency, status, item_type, created_at, updated_at
    ) VALUES (
        p_order_reference, p_user_id, 'Ezone Pay', p_provider_tx_id, p_amount_lyd, 'LYD', 'paid', p_item_type, NOW(), NOW()
    )
    ON CONFLICT (order_reference) DO UPDATE
    SET status = 'paid',
        provider_tx_id = EXCLUDED.provider_tx_id,
        updated_at = NOW();

    RETURN QUERY SELECT FALSE, TRUE, 'SUCCESS'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE INDEX IF NOT EXISTS idx_payment_idempotency_order_ref ON public.payment_idempotency(order_reference);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_provider_tx ON public.payment_transactions(provider_tx_id);

COMMIT;