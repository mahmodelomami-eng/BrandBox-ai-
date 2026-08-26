-- Brand Box AI — conservative Pilot v1 pricing for staging validation
BEGIN;

UPDATE public.plans
SET price_monthly_lyd = CASE id
      WHEN 'free' THEN 0
      WHEN 'starter' THEN 49
      WHEN 'pro' THEN 149
      WHEN 'business' THEN 449
      ELSE price_monthly_lyd
    END,
    price_monthly_usd = CASE id
      WHEN 'free' THEN 0
      WHEN 'starter' THEN 5
      WHEN 'pro' THEN 14
      WHEN 'business' THEN 41
      ELSE price_monthly_usd
    END,
    monthly_credits = CASE id
      WHEN 'free' THEN 50
      WHEN 'starter' THEN 300
      WHEN 'pro' THEN 1200
      WHEN 'business' THEN 4000
      ELSE monthly_credits
    END,
    metadata = COALESCE(metadata,'{}'::jsonb) || CASE id
      WHEN 'free' THEN jsonb_build_object('pricing_status','pilot_v1','credit_label','Credit','audience','تجربة المنصة','rollover_note','لا يوجد ترحيل في الخطة المجانية')
      WHEN 'starter' THEN jsonb_build_object('pricing_status','pilot_v1','credit_label','Credit','audience','الأفراد وصناع المحتوى','rollover_note','ترحيل لدورة واحدة حتى 100% من مخصص الخطة','renewal_grace_days',7)
      WHEN 'pro' THEN jsonb_build_object('pricing_status','pilot_v1','credit_label','Credit','audience','المحترفون والشركات الصغيرة','rollover_note','ترحيل لدورة واحدة حتى 100% من مخصص الخطة','renewal_grace_days',7)
      WHEN 'business' THEN jsonb_build_object('pricing_status','pilot_v1','credit_label','Credit','audience','الفرق والوكالات','rollover_note','ترحيل لدورة واحدة حتى 100% من مخصص الخطة','renewal_grace_days',7)
      ELSE '{}'::jsonb
    END,
    updated_at = NOW()
WHERE id IN ('free','starter','pro','business');

UPDATE public.credit_packages SET is_active = FALSE, updated_at = NOW();

INSERT INTO public.credit_packages (
  id, name, credits, purchased_credits, bonus_credits, price_lyd,
  bonus_valid_days, is_featured, sort_order, is_active, metadata, created_at, updated_at
) VALUES
  ('credit_100', '100 Credit', 100, 100, 0, 18, 60, FALSE, 10, TRUE,
    jsonb_build_object('pricing_status','pilot_v1','bonus_pct',0,'minimum_topup',TRUE), NOW(), NOW()),
  ('credit_315', '315 Credit', 315, 300, 15, 50, 60, FALSE, 20, TRUE,
    jsonb_build_object('pricing_status','pilot_v1','bonus_pct',5), NOW(), NOW()),
  ('credit_770', '770 Credit', 770, 700, 70, 110, 60, FALSE, 30, TRUE,
    jsonb_build_object('pricing_status','pilot_v1','bonus_pct',10), NOW(), NOW()),
  ('credit_1725', '1,725 Credit', 1725, 1500, 225, 225, 60, TRUE, 40, TRUE,
    jsonb_build_object('pricing_status','pilot_v1','bonus_pct',15), NOW(), NOW()),
  ('credit_4600', '4,600 Credit', 4600, 4000, 600, 580, 60, FALSE, 50, TRUE,
    jsonb_build_object('pricing_status','pilot_v1','bonus_pct',15), NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  credits = EXCLUDED.credits,
  purchased_credits = EXCLUDED.purchased_credits,
  bonus_credits = EXCLUDED.bonus_credits,
  price_lyd = EXCLUDED.price_lyd,
  bonus_valid_days = EXCLUDED.bonus_valid_days,
  is_featured = EXCLUDED.is_featured,
  sort_order = EXCLUDED.sort_order,
  is_active = TRUE,
  metadata = EXCLUDED.metadata,
  updated_at = NOW();

COMMIT;
