-- Initial Brand Box Store catalog.
-- IMPORTANT: every entry is intentionally non-purchasable until supplier authorization,
-- regional validity, pricing and automated fulfillment are verified.

insert into public.store_categories (slug, name_ar, name_en, sort_order)
values
  ('ai', 'الذكاء الاصطناعي', 'AI', 10),
  ('design', 'التصميم', 'Design', 20),
  ('business', 'الأعمال والإنتاجية', 'Business & Productivity', 30),
  ('entertainment', 'الترفيه', 'Entertainment', 40),
  ('gaming', 'الألعاب', 'Gaming', 50),
  ('digital-cards', 'البطاقات الرقمية', 'Digital Cards', 60),
  ('software', 'البرامج والحماية', 'Software & Security', 70)
on conflict (slug) do update set
  name_ar = excluded.name_ar,
  name_en = excluded.name_en,
  sort_order = excluded.sort_order,
  updated_at = now();

insert into public.store_providers (code, display_name, provider_type, status, metadata)
values
  ('openai', 'OpenAI', 'PARTNER_REQUIRED', 'DRAFT', '{"research_status":"authorization_required"}'),
  ('google', 'Google', 'PARTNER_REQUIRED', 'DRAFT', '{"research_status":"authorization_required"}'),
  ('anthropic', 'Anthropic', 'PARTNER_REQUIRED', 'DRAFT', '{"research_status":"authorization_required"}'),
  ('midjourney', 'Midjourney', 'CATALOG_ONLY', 'DRAFT', '{"research_status":"catalog_only"}'),
  ('elevenlabs', 'ElevenLabs', 'PARTNER_REQUIRED', 'DRAFT', '{"research_status":"authorization_required"}'),
  ('adobe', 'Adobe', 'PARTNER_REQUIRED', 'DRAFT', '{"research_status":"reseller_review"}'),
  ('canva', 'Canva', 'PARTNER_REQUIRED', 'DRAFT', '{"research_status":"reseller_review"}'),
  ('capcut', 'CapCut', 'PARTNER_REQUIRED', 'DRAFT', '{"research_status":"partner_review"}'),
  ('microsoft', 'Microsoft', 'PARTNER_REQUIRED', 'DRAFT', '{"research_status":"reseller_review"}'),
  ('netflix', 'Netflix', 'CATALOG_ONLY', 'DRAFT', '{"research_status":"voucher_or_partner_required"}'),
  ('shahid', 'Shahid', 'PARTNER_REQUIRED', 'DRAFT', '{"research_status":"voucher_or_partner_required"}'),
  ('spotify', 'Spotify', 'CATALOG_ONLY', 'DRAFT', '{"research_status":"regional_voucher_review"}'),
  ('youtube', 'YouTube', 'CATALOG_ONLY', 'DRAFT', '{"research_status":"regional_partner_review"}'),
  ('valve', 'Steam', 'PARTNER_REQUIRED', 'DRAFT', '{"research_status":"authorized_wallet_supplier_required"}'),
  ('playstation', 'PlayStation', 'PARTNER_REQUIRED', 'DRAFT', '{"research_status":"authorized_code_supplier_required"}'),
  ('xbox', 'Xbox', 'PARTNER_REQUIRED', 'DRAFT', '{"research_status":"authorized_code_supplier_required"}'),
  ('nintendo', 'Nintendo', 'PARTNER_REQUIRED', 'DRAFT', '{"research_status":"authorized_code_supplier_required"}'),
  ('apple', 'Apple', 'CATALOG_ONLY', 'DRAFT', '{"research_status":"regional_gift_card_review"}'),
  ('google-play', 'Google Play', 'CATALOG_ONLY', 'DRAFT', '{"research_status":"regional_gift_card_review"}'),
  ('discord', 'Discord', 'CATALOG_ONLY', 'DRAFT', '{"research_status":"official_gift_or_partner_review"}')
on conflict (code) do update set
  display_name = excluded.display_name,
  provider_type = excluded.provider_type,
  metadata = excluded.metadata,
  updated_at = now();

with p as (select id, code from public.store_providers),
     c as (select id, slug from public.store_categories)
insert into public.store_products (
  category_id, provider_id, slug, name, brand, short_description,
  fulfillment_mode, sale_status, supplier_authorization_verified,
  regional_validity_verified, automated_fulfillment_verified, metadata
)
select c.id, p.id, v.slug, v.name, v.brand, v.description,
       v.mode, 'CATALOG_ONLY', false, false, false,
       jsonb_build_object('catalog_phase','research','launch_gate','blocked')
from (values
  ('chatgpt','ChatGPT','OpenAI','مساعد ذكاء اصطناعي للمحادثة والإنتاجية.','PARTNER_REQUIRED','openai','ai'),
  ('gemini','Gemini','Google','مساعد ونماذج ذكاء اصطناعي من Google.','PARTNER_REQUIRED','google','ai'),
  ('claude','Claude','Anthropic','مساعد ذكاء اصطناعي للكتابة والتحليل.','PARTNER_REQUIRED','anthropic','ai'),
  ('midjourney','Midjourney','Midjourney','توليد الصور بالذكاء الاصطناعي.','CATALOG_ONLY','midjourney','ai'),
  ('elevenlabs','ElevenLabs','ElevenLabs','توليد وتحويل الصوت بالذكاء الاصطناعي.','PARTNER_REQUIRED','elevenlabs','ai'),
  ('adobe-creative-cloud','Adobe Creative Cloud','Adobe','حزمة تطبيقات التصميم والإبداع.','PARTNER_REQUIRED','adobe','design'),
  ('canva','Canva','Canva','منصة تصميم ومحتوى مرئي.','PARTNER_REQUIRED','canva','design'),
  ('capcut','CapCut','CapCut','تحرير وصناعة الفيديو.','PARTNER_REQUIRED','capcut','design'),
  ('microsoft-365','Microsoft 365','Microsoft','تطبيقات الإنتاجية والأعمال.','PARTNER_REQUIRED','microsoft','business'),
  ('netflix','Netflix','Netflix','اشتراك ترفيه وبث رقمي.','CATALOG_ONLY','netflix','entertainment'),
  ('shahid','Shahid','Shahid','منصة بث وترفيه عربي.','PARTNER_REQUIRED','shahid','entertainment'),
  ('spotify-premium','Spotify Premium','Spotify','اشتراك موسيقى رقمي.','CATALOG_ONLY','spotify','entertainment'),
  ('youtube-premium','YouTube Premium','YouTube','اشتراك YouTube Premium.','CATALOG_ONLY','youtube','entertainment'),
  ('steam-wallet','Steam Wallet','Steam','رصيد محفظة Steam للألعاب.','PARTNER_REQUIRED','valve','gaming'),
  ('playstation-store','PlayStation Store / Plus','PlayStation','بطاقات وأكواد PlayStation بحسب المنطقة.','PARTNER_REQUIRED','playstation','gaming'),
  ('xbox-game-pass','Xbox / Game Pass','Xbox','أكواد وخدمات Xbox بحسب المنطقة.','PARTNER_REQUIRED','xbox','gaming'),
  ('nintendo-eshop','Nintendo eShop','Nintendo','بطاقات Nintendo eShop بحسب المنطقة.','PARTNER_REQUIRED','nintendo','gaming'),
  ('apple-gift-card','Apple Digital Value','Apple','قيمة رقمية بحسب التوفر والمنطقة.','CATALOG_ONLY','apple','digital-cards'),
  ('google-play-value','Google Play Digital Value','Google Play','قيمة رقمية بحسب التوفر والمنطقة.','CATALOG_ONLY','google-play','digital-cards'),
  ('discord-nitro','Discord Nitro','Discord','اشتراك رقمي عبر قناة رسمية عند توفرها.','CATALOG_ONLY','discord','digital-cards')
) as v(slug,name,brand,description,mode,provider_code,category_slug)
join p on p.code = v.provider_code
join c on c.slug = v.category_slug
on conflict (slug) do update set
  name = excluded.name,
  brand = excluded.brand,
  short_description = excluded.short_description,
  provider_id = excluded.provider_id,
  category_id = excluded.category_id,
  fulfillment_mode = excluded.fulfillment_mode,
  updated_at = now();
