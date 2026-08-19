BEGIN;

-- Platform readiness: server-owned credit packages and idempotent grant/refund RPC.
CREATE TABLE IF NOT EXISTS public.credit_packages (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  credits INTEGER NOT NULL CHECK (credits > 0),
  bonus_credits INTEGER DEFAULT 0 NOT NULL CHECK (bonus_credits >= 0),
  price_lyd NUMERIC(10,2) NOT NULL CHECK (price_lyd >= 0),
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

INSERT INTO public.credit_packages (id,name,description,credits,bonus_credits,price_lyd,is_active)
VALUES
 ('pkg_100','100 نقطة','حزمة بداية',100,0,25,TRUE),
 ('pkg_500','500 نقطة','حزمة موفرة',500,50,100,TRUE),
 ('pkg_1000','1000 نقطة','حزمة احترافية',1000,150,175,TRUE),
 ('pkg_5000','5000 نقطة','حزمة أعمال',5000,1000,750,TRUE)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.credit_packages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read active credit packages" ON public.credit_packages;
CREATE POLICY "Anyone can read active credit packages" ON public.credit_packages
  FOR SELECT USING (is_active = TRUE OR public.get_user_role(auth.uid()) IN ('SUPER_ADMIN','ADMIN'));

CREATE OR REPLACE FUNCTION public.grant_credits_idempotent(
  p_user_id UUID,
  p_amount INTEGER,
  p_description TEXT,
  p_reference_type TEXT,
  p_reference_id TEXT,
  p_idempotency_key TEXT DEFAULT NULL,
  p_actor_id UUID DEFAULT NULL,
  p_transaction_type TEXT DEFAULT 'grant'
)
RETURNS TABLE(success BOOLEAN,new_balance INTEGER,message TEXT,transaction_id TEXT) AS $$
DECLARE
  v_balance INTEGER;
  v_existing RECORD;
  v_tx_id TEXT;
BEGIN
  IF p_amount <= 0 THEN
    RETURN QUERY SELECT FALSE,0,'INVALID_AMOUNT'::TEXT,NULL::TEXT; RETURN;
  END IF;

  IF p_transaction_type NOT IN ('grant','subscription','purchase','admin_adjustment','refund') THEN
    RETURN QUERY SELECT FALSE,0,'INVALID_TRANSACTION_TYPE'::TEXT,NULL::TEXT; RETURN;
  END IF;

  IF p_idempotency_key IS NOT NULL THEN
    SELECT * INTO v_existing FROM public.credit_idempotency WHERE idempotency_key = p_idempotency_key;
    IF v_existing.idempotency_key IS NOT NULL THEN
      SELECT credit_balance INTO v_balance FROM public.profiles WHERE id = p_user_id;
      RETURN QUERY SELECT TRUE,COALESCE(v_balance,0),'IDEMPOTENT_DUPLICATE_SKIPPED'::TEXT,v_existing.transaction_id;
      RETURN;
    END IF;
  END IF;

  SELECT credit_balance INTO v_balance FROM public.profiles WHERE id = p_user_id FOR UPDATE;
  IF v_balance IS NULL THEN
    RETURN QUERY SELECT FALSE,0,'USER_NOT_FOUND'::TEXT,NULL::TEXT; RETURN;
  END IF;

  UPDATE public.profiles SET credit_balance = credit_balance + p_amount, updated_at = NOW() WHERE id = p_user_id;
  v_tx_id := 'tx_' || gen_random_uuid()::text;

  INSERT INTO public.credit_transactions(id,user_id,amount,transaction_type,description,reference_type,reference_id,actor_id,idempotency_key)
  VALUES(v_tx_id,p_user_id,p_amount,p_transaction_type,p_description,p_reference_type,p_reference_id,COALESCE(p_actor_id,p_user_id),p_idempotency_key);

  IF p_idempotency_key IS NOT NULL THEN
    INSERT INTO public.credit_idempotency(idempotency_key,user_id,action,amount,transaction_id)
    VALUES(p_idempotency_key,p_user_id,CASE WHEN p_transaction_type='refund' THEN 'refund' ELSE 'grant' END,p_amount,v_tx_id)
    ON CONFLICT (idempotency_key) DO NOTHING;
  END IF;

  RETURN QUERY SELECT TRUE,v_balance+p_amount,'SUCCESS'::TEXT,v_tx_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Ensure RPC callers cannot execute these financial functions anonymously.
REVOKE ALL ON FUNCTION public.grant_credits_idempotent(UUID,INTEGER,TEXT,TEXT,TEXT,TEXT,UUID,TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.deduct_credits_idempotent(UUID,INTEGER,TEXT,TEXT,TEXT,TEXT,UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.refund_credits_idempotent(UUID,INTEGER,TEXT,TEXT,TEXT,TEXT,UUID) FROM PUBLIC;

-- Service-role is used by trusted server code; authenticated clients never call these directly.
GRANT EXECUTE ON FUNCTION public.grant_credits_idempotent(UUID,INTEGER,TEXT,TEXT,TEXT,TEXT,UUID,TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.deduct_credits_idempotent(UUID,INTEGER,TEXT,TEXT,TEXT,TEXT,UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.refund_credits_idempotent(UUID,INTEGER,TEXT,TEXT,TEXT,TEXT,UUID) TO service_role;

CREATE INDEX IF NOT EXISTS idx_credit_packages_active ON public.credit_packages(is_active);
CREATE INDEX IF NOT EXISTS idx_generations_project ON public.generations(project_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_idempotency_provider_tx ON public.payment_idempotency(provider_tx_id);

COMMIT;
