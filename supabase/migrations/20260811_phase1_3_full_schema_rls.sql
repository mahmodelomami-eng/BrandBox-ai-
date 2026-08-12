BEGIN;

-- 1. App Role Enum Definition
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
        CREATE TYPE public.app_role AS ENUM ('USER', 'SUPPORT', 'ADMIN', 'SUPER_ADMIN');
    END IF;
END $$;

-- 2. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    first_name TEXT DEFAULT '' NOT NULL,
    last_name TEXT DEFAULT '' NOT NULL,
    phone TEXT,
    avatar_url TEXT,
    role public.app_role DEFAULT 'USER'::public.app_role NOT NULL,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'pending')) NOT NULL,
    credit_balance INTEGER DEFAULT 50 CHECK (credit_balance >= 0) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 3. Commercial Plans Table
CREATE TABLE IF NOT EXISTS public.plans (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    price_monthly_lyd NUMERIC(10, 2) NOT NULL,
    price_monthly_usd NUMERIC(10, 2) NOT NULL,
    monthly_credits INTEGER NOT NULL,
    max_projects INTEGER DEFAULT 2 NOT NULL,
    video_access BOOLEAN DEFAULT FALSE NOT NULL,
    brand_kit_access BOOLEAN DEFAULT TRUE NOT NULL,
    commercial_usage BOOLEAN DEFAULT FALSE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

INSERT INTO public.plans (id, name, description, price_monthly_lyd, price_monthly_usd, monthly_credits, max_projects, video_access, brand_kit_access, commercial_usage, is_active)
VALUES
  ('free', 'المجانية (Free)', 'مثالية لتجربة المنصة واستكشاف الأدوات الأساسية.', 0, 0, 50, 2, FALSE, TRUE, FALSE, TRUE),
  ('starter', 'الأساسية (Starter)', 'للمستقلين وصناع المحتوى الناشئين.', 45, 9, 200, 5, FALSE, TRUE, TRUE, TRUE),
  ('pro', 'الاحترافية (Pro)', 'الخيار الأفضل للشركات الناشئة والمصممين المحترفين.', 145, 29, 1000, 25, TRUE, TRUE, TRUE, TRUE),
  ('business', 'الأعمال (Business)', 'للوكالات الرقمية والفرق التسويقية التنافسية.', 395, 79, 5000, 100, TRUE, TRUE, TRUE, TRUE)
ON CONFLICT (id) DO NOTHING;

-- 4. Subscriptions Table
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id TEXT PRIMARY KEY DEFAULT 'sub_' || gen_random_uuid()::text,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    plan_id TEXT NOT NULL REFERENCES public.plans(id),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired', 'past_due')) NOT NULL,
    provider TEXT DEFAULT 'Ezone Pay' NOT NULL,
    external_subscription_id TEXT,
    current_period_start TIMESTAMPTZ NOT NULL,
    current_period_end TIMESTAMPTZ NOT NULL,
    auto_renew BOOLEAN DEFAULT TRUE NOT NULL,
    cancelled_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 5. Payment Transactions Table
CREATE TABLE IF NOT EXISTS public.payment_transactions (
    id TEXT PRIMARY KEY DEFAULT 'pay_' || gen_random_uuid()::text,
    order_reference TEXT UNIQUE NOT NULL,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    provider TEXT DEFAULT 'Ezone Pay' NOT NULL,
    provider_tx_id TEXT,
    amount_lyd NUMERIC(10, 2) NOT NULL,
    currency TEXT DEFAULT 'LYD' NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'cancelled', 'refunded')) NOT NULL,
    item_type TEXT CHECK (item_type IN ('subscription', 'purchase')) NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 6. Durable Payment Idempotency Ledger
CREATE TABLE IF NOT EXISTS public.payment_idempotency (
    order_reference TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL,
    processed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    payload_hash TEXT NOT NULL
);

-- 7. Credit Transactions Table
CREATE TABLE IF NOT EXISTS public.credit_transactions (
    id TEXT PRIMARY KEY DEFAULT 'tx_' || gen_random_uuid()::text,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    transaction_type TEXT CHECK (transaction_type IN ('grant', 'deduction', 'refund', 'subscription', 'purchase', 'generation', 'admin_adjustment')) NOT NULL,
    description TEXT NOT NULL,
    reference_type TEXT,
    reference_id TEXT,
    actor_id UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Atomic Credit Deduction Procedure with Row-Level Locking
CREATE OR REPLACE FUNCTION public.deduct_credits_atomic(
    p_user_id UUID,
    p_amount INTEGER,
    p_description TEXT,
    p_reference_type TEXT,
    p_reference_id TEXT,
    p_actor_id UUID DEFAULT NULL
)
RETURNS TABLE (success BOOLEAN, new_balance INTEGER, message TEXT) AS $$
DECLARE
    v_current_balance INTEGER;
BEGIN
    IF p_amount <= 0 THEN
        RETURN QUERY SELECT FALSE, 0, 'INVALID_AMOUNT: Deduction amount must be positive'::TEXT;
        RETURN;
    END IF;

    SELECT credit_balance INTO v_current_balance
    FROM public.profiles
    WHERE id = p_user_id
    FOR UPDATE;

    IF v_current_balance IS NULL THEN
        RETURN QUERY SELECT FALSE, 0, 'USER_NOT_FOUND'::TEXT;
        RETURN;
    END IF;

    IF v_current_balance < p_amount THEN
        RETURN QUERY SELECT FALSE, v_current_balance, 'INSUFFICIENT_CREDITS'::TEXT;
        RETURN;
    END IF;

    UPDATE public.profiles
    SET credit_balance = credit_balance - p_amount,
        updated_at = NOW()
    WHERE id = p_user_id;

    INSERT INTO public.credit_transactions (
        user_id, amount, transaction_type, description, reference_type, reference_id, actor_id
    ) VALUES (
        p_user_id, -p_amount, 'deduction', p_description, p_reference_type, p_reference_id, COALESCE(p_actor_id, p_user_id)
    );

    RETURN QUERY SELECT TRUE, (v_current_balance - p_amount), 'SUCCESS'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Atomic Credit Grant Procedure
CREATE OR REPLACE FUNCTION public.grant_credits_atomic(
    p_user_id UUID,
    p_amount INTEGER,
    p_description TEXT,
    p_reference_type TEXT,
    p_reference_id TEXT,
    p_actor_id UUID DEFAULT NULL,
    p_tx_type TEXT DEFAULT 'grant'
)
RETURNS TABLE (success BOOLEAN, new_balance INTEGER, message TEXT) AS $$
DECLARE
    v_current_balance INTEGER;
BEGIN
    IF p_amount <= 0 THEN
        RETURN QUERY SELECT FALSE, 0, 'INVALID_AMOUNT: Grant amount must be positive'::TEXT;
        RETURN;
    END IF;

    SELECT credit_balance INTO v_current_balance
    FROM public.profiles
    WHERE id = p_user_id
    FOR UPDATE;

    IF v_current_balance IS NULL THEN
        RETURN QUERY SELECT FALSE, 0, 'USER_NOT_FOUND'::TEXT;
        RETURN;
    END IF;

    UPDATE public.profiles
    SET credit_balance = credit_balance + p_amount,
        updated_at = NOW()
    WHERE id = p_user_id;

    INSERT INTO public.credit_transactions (
        user_id, amount, transaction_type, description, reference_type, reference_id, actor_id
    ) VALUES (
        p_user_id, p_amount, p_tx_type, p_description, p_reference_type, p_reference_id, COALESCE(p_actor_id, p_user_id)
    );

    RETURN QUERY SELECT TRUE, (v_current_balance + p_amount), 'SUCCESS'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 8. Projects Table
CREATE TABLE IF NOT EXISTS public.projects (
    id TEXT PRIMARY KEY DEFAULT 'proj_' || gen_random_uuid()::text,
    owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT DEFAULT 'صورة + نص' NOT NULL,
    description TEXT,
    industry TEXT,
    target_audience TEXT,
    language TEXT DEFAULT 'العربية' NOT NULL,
    tone TEXT DEFAULT 'احترافي' NOT NULL,
    thumbnail_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 9. Generations Table
CREATE TABLE IF NOT EXISTS public.generations (
    id TEXT PRIMARY KEY DEFAULT 'gen_' || gen_random_uuid()::text,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    project_id TEXT REFERENCES public.projects(id) ON DELETE SET NULL,
    generation_type TEXT CHECK (generation_type IN ('chat', 'image', 'video')) NOT NULL,
    provider TEXT NOT NULL,
    model TEXT NOT NULL,
    prompt TEXT NOT NULL,
    negative_prompt TEXT,
    settings JSONB DEFAULT '{}'::jsonb,
    status TEXT DEFAULT 'processing' CHECK (status IN ('queued', 'processing', 'completed', 'failed', 'cancelled')) NOT NULL,
    credits_consumed INTEGER DEFAULT 0 NOT NULL,
    result_url TEXT,
    error_message TEXT,
    duration_ms INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 10. Assets Table
CREATE TABLE IF NOT EXISTS public.assets (
    id TEXT PRIMARY KEY DEFAULT 'asset_' || gen_random_uuid()::text,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    project_id TEXT REFERENCES public.projects(id) ON DELETE CASCADE,
    generation_id TEXT REFERENCES public.generations(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    width INTEGER,
    height INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 11. Audit Logs Table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id TEXT PRIMARY KEY DEFAULT 'audit_' || gen_random_uuid()::text,
    actor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    actor_role TEXT NOT NULL,
    action TEXT NOT NULL,
    resource TEXT NOT NULL,
    resource_id TEXT,
    before_state JSONB DEFAULT '{}'::jsonb,
    after_state JSONB DEFAULT '{}'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 12. Rate Limit Hits Table
CREATE TABLE IF NOT EXISTS public.rate_limit_hits (
    key TEXT PRIMARY KEY,
    category TEXT NOT NULL,
    hit_count INTEGER DEFAULT 1 NOT NULL,
    reset_at TIMESTAMPTZ NOT NULL
);

-- Role Resolution Helper
CREATE OR REPLACE FUNCTION public.get_user_role(p_user_id UUID)
RETURNS public.app_role AS $$
DECLARE
    v_role public.app_role;
BEGIN
    IF p_user_id IS NULL THEN
        RETURN 'USER'::public.app_role;
    END IF;

    SELECT role INTO v_role 
    FROM public.profiles 
    WHERE id = p_user_id;

    IF v_role IS NULL THEN
        RETURN 'USER'::public.app_role;
    END IF;

    RETURN v_role;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- Role Change Protection Trigger
CREATE OR REPLACE FUNCTION public.prevent_unauthorized_role_change()
RETURNS TRIGGER AS $$
DECLARE
    v_actor_id UUID;
    v_actor_role public.app_role;
BEGIN
    IF OLD.role IS NOT DISTINCT FROM NEW.role THEN
        RETURN NEW;
    END IF;

    v_actor_id := auth.uid();
    IF v_actor_id IS NULL THEN
        RETURN NEW;
    END IF;

    v_actor_role := public.get_user_role(v_actor_id);

    IF v_actor_role != 'SUPER_ADMIN'::public.app_role THEN
        RAISE EXCEPTION 'FORBIDDEN: Only SUPER_ADMIN can assign or modify administrative roles.'
            USING ERRCODE = '42501';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_prevent_role_escalation ON public.profiles;
CREATE TRIGGER trg_prevent_role_escalation
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_unauthorized_role_change();

-- Audit Log Immutability Trigger
CREATE OR REPLACE FUNCTION public.prevent_audit_log_modification()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'UPDATE' OR TG_OP = 'DELETE') THEN
        RAISE EXCEPTION 'FORBIDDEN: Audit logs are immutable and cannot be updated or deleted.'
            USING ERRCODE = '42501';
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_prevent_audit_log_modification ON public.audit_logs;
CREATE TRIGGER trg_prevent_audit_log_modification
    BEFORE UPDATE OR DELETE ON public.audit_logs
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_audit_log_modification();

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_idempotency ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id OR public.get_user_role(auth.uid()) IN ('SUPER_ADMIN', 'ADMIN', 'SUPPORT'));

DROP POLICY IF EXISTS "Users can update own non-role fields" ON public.profiles;
CREATE POLICY "Users can update own non-role fields" ON public.profiles
    FOR UPDATE USING (auth.uid() = id OR public.get_user_role(auth.uid()) = 'SUPER_ADMIN');

DROP POLICY IF EXISTS "Anyone can read active plans" ON public.plans;
CREATE POLICY "Anyone can read active plans" ON public.plans
    FOR SELECT USING (is_active = TRUE OR public.get_user_role(auth.uid()) IN ('SUPER_ADMIN', 'ADMIN'));

DROP POLICY IF EXISTS "Users can read own subscriptions" ON public.subscriptions;
CREATE POLICY "Users can read own subscriptions" ON public.subscriptions
    FOR SELECT USING (auth.uid() = user_id OR public.get_user_role(auth.uid()) IN ('SUPER_ADMIN', 'ADMIN', 'SUPPORT'));

DROP POLICY IF EXISTS "Users can read own payment transactions" ON public.payment_transactions;
CREATE POLICY "Users can read own payment transactions" ON public.payment_transactions
    FOR SELECT USING (auth.uid() = user_id OR public.get_user_role(auth.uid()) IN ('SUPER_ADMIN', 'ADMIN', 'SUPPORT'));

DROP POLICY IF EXISTS "Users can read own credit ledger" ON public.credit_transactions;
CREATE POLICY "Users can read own credit ledger" ON public.credit_transactions
    FOR SELECT USING (auth.uid() = user_id OR public.get_user_role(auth.uid()) IN ('SUPER_ADMIN', 'ADMIN'));

DROP POLICY IF EXISTS "Users can manage own projects" ON public.projects;
CREATE POLICY "Users can manage own projects" ON public.projects
    FOR ALL USING (auth.uid() = owner_id OR public.get_user_role(auth.uid()) IN ('SUPER_ADMIN', 'ADMIN', 'SUPPORT'));

DROP POLICY IF EXISTS "Users can manage own generations" ON public.generations;
CREATE POLICY "Users can manage own generations" ON public.generations
    FOR ALL USING (auth.uid() = user_id OR public.get_user_role(auth.uid()) IN ('SUPER_ADMIN', 'ADMIN', 'SUPPORT'));

DROP POLICY IF EXISTS "Users can manage own assets" ON public.assets;
CREATE POLICY "Users can manage own assets" ON public.assets
    FOR ALL USING (auth.uid() = user_id OR public.get_user_role(auth.uid()) IN ('SUPER_ADMIN', 'ADMIN', 'SUPPORT'));

DROP POLICY IF EXISTS "Admins can read audit logs" ON public.audit_logs;
CREATE POLICY "Admins can read audit logs" ON public.audit_logs
    FOR SELECT USING (public.get_user_role(auth.uid()) IN ('SUPER_ADMIN', 'ADMIN'));

-- Composite Indexes
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON public.subscriptions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_payments_order_ref ON public.payment_transactions(order_reference);
CREATE INDEX IF NOT EXISTS idx_payments_user ON public.payment_transactions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_credits_user ON public.credit_transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_projects_owner ON public.projects(owner_id);
CREATE INDEX IF NOT EXISTS idx_generations_user ON public.generations(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_assets_user ON public.assets(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_actor ON public.audit_logs(actor_id, created_at DESC);

COMMIT;