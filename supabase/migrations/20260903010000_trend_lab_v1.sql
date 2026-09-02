create table if not exists public.trend_templates (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{3,80}$'),
  title_ar text not null check (char_length(title_ar) between 3 and 120),
  subtitle_ar text not null default '' check (char_length(subtitle_ar) <= 220),
  description_ar text not null default '' check (char_length(description_ar) <= 1200),
  category text not null default 'social' check (category in ('social','comedy','commercial','products','portraits','video','seasonal','libyan','arabic','evergreen')),
  content_type text not null default 'image' check (content_type in ('image','video','mixed')),
  status text not null default 'discovered' check (status in ('discovered','review','designing','approved','published','evergreen','archived')),
  trend_score smallint not null default 0 check (trend_score between 0 and 100),
  source_platform text,
  source_url text,
  source_signal text,
  prompt_template text not null check (char_length(prompt_template) between 20 and 6000),
  negative_prompt text,
  variables jsonb not null default '[]'::jsonb check (jsonb_typeof(variables) = 'array'),
  model_hint text,
  aspect_ratios text[] not null default array['4:5']::text[],
  requires_reference boolean not null default false,
  preview_url text,
  sample_urls jsonb not null default '[]'::jsonb check (jsonb_typeof(sample_urls) = 'array'),
  social_caption_ar text,
  cta_ar text not null default 'جرّب هذا الترند',
  usage_count bigint not null default 0 check (usage_count >= 0),
  discovered_at timestamptz not null default now(),
  last_reviewed_at timestamptz,
  published_at timestamptz,
  expires_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists trend_templates_public_index
  on public.trend_templates (status, trend_score desc, published_at desc nulls last);
create index if not exists trend_templates_category_index
  on public.trend_templates (category, status, trend_score desc);
create index if not exists trend_templates_review_index
  on public.trend_templates (status, updated_at desc);

alter table public.trend_templates enable row level security;

drop policy if exists trend_templates_public_read on public.trend_templates;
create policy trend_templates_public_read
  on public.trend_templates
  for select
  to anon, authenticated
  using (status in ('published','evergreen'));

revoke insert, update, delete on public.trend_templates from anon, authenticated;
grant select on public.trend_templates to anon, authenticated;

create or replace function public.increment_trend_template_usage(p_trend_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.trend_templates
  set usage_count = usage_count + 1,
      updated_at = now()
  where id = p_trend_id
    and status in ('published','evergreen');
end;
$$;

revoke all on function public.increment_trend_template_usage(uuid) from public;
grant execute on function public.increment_trend_template_usage(uuid) to authenticated;

insert into public.trend_templates (
  slug,title_ar,subtitle_ar,description_ar,category,content_type,status,trend_score,source_platform,source_signal,prompt_template,negative_prompt,variables,model_hint,aspect_ratios,requires_reference,social_caption_ar,cta_ar,published_at
) values
(
  'tiny-self-big-head','نسختك الصغيرة فوق رأسك','مشهد سريالي مرح يضاعف الشخصية بحجمين مختلفين.','نسخة صغيرة من الشخصية تجلس فوق رأس نسخة عملاقة من نفس الفكرة. مناسب للصور الترفيهية والميمز والإعلانات الخفيفة.','portraits','image','published',88,'Brand Box editorial','Surreal scale-play / mini-self visual mechanic','أنشئ بورتريه سريالي فوتوغرافي عالي الواقعية لشخص عربي {{الشخصية}}. يظهر الوجه أو الرأس بحجم كبير في مقدمة المشهد، وفوق الرأس نسخة مصغرة من نفس الشخصية بكامل الجسم تجلس بثبات وبمنظور صحيح. حافظ على تطابق الملابس والسمات العامة بين النسختين، إضاءة سينمائية ناعمة، تفاصيل جلد وقماش طبيعية، عمق ميدان احترافي، تكوين رأسي مناسب للسوشيال، بدون نص داخل الصورة.','تشوه الوجه، أطراف إضافية، يدان مشوهتان، نص عشوائي، شعار، علامة مائية','[{"key":"الشخصية","label":"وصف الشخصية","placeholder":"مثال: شاب ليبي بثوب أبيض ونظارة شمسية","required":true,"maxLength":180}]'::jsonb,'image generation',array['4:5','9:16'],false,'ترند الحجمين 👀 نسخة منك فوق راسك... جرّبه بأسلوب Brand Box.','جرّبه على فكرتك',now()
),
(
  'money-face-capital','رأس المال — حرفيًا','حوّل التعبير العربي إلى مشهد بصري ساخر.','فكرة لغوية عربية تتحول إلى صورة حرفية: وجه مصنوع من رزم نقود مع ملابس خليجية أو عربية أنيقة.','arabic','image','published',84,'Brand Box editorial','Arabic idiom literalization','أنشئ بورتريه إعلاني سريالي لشخص عربي يرتدي {{الملابس}}، لكن الوجه بالكامل عبارة عن طبقات ورزم أوراق نقدية مصفوفة هندسيًا بشكل رأس بشري، مع الحفاظ على غطاء الرأس والكتفين واليدين طبيعيين. خلفية ليلية راقية مع بوكيه دافئ، تصوير فوتوغرافي واقعي، لقطة أمامية، إضاءة استوديو سينمائية، بدون كتابة أو شعارات.','ملامح رعب، دم، نص داخل الصورة، علامة مائية، تشوه اليدين','[{"key":"الملابس","label":"الملابس","placeholder":"مثال: ثوب أبيض وشماغ أحمر","required":true,"maxLength":120}]'::jsonb,'image generation',array['4:5','9:16'],false,'«رأس المال» لكن هذه المرة بشكل حرفي 😄','استخدم الفكرة',now()
),
(
  'flying-from-joy','طاير من الفرحة','تعبير عربي يتحول إلى لقطة خيالية مشرقة.','شخص يطير فوق السحب بأجنحة كبيرة في مشهد فرِح ومشرق يصلح للمحتوى الاجتماعي والمناسبات.','social','image','published',82,'Brand Box editorial','Arabic idiom literalization / joyful fantasy','أنشئ لقطة فوتوغرافية خيالية لشخص عربي {{الشخصية}} يطير عاليًا فوق السحب بأجنحة بيضاء كبيرة ومقنعة بصريًا، ذراعاه مفتوحتان بتعبير فرح واضح، السماء زرقاء وإضاءة شروق ذهبية، الملابس تتحرك طبيعيًا مع الهواء، منظور بطولي واسع، واقعية سينمائية، بدون نص أو شعار.','أجنحة مشوهة، أطراف إضافية، تشوه الوجه، نص، علامة مائية','[{"key":"الشخصية","label":"الشخصية","placeholder":"مثال: رجل عربي بثوب أبيض وشماغ أحمر","required":true,"maxLength":160}]'::jsonb,'image generation',array['4:5','9:16'],false,'لما تكون «طاير من الفرحة» فعلًا ✨','جرّب الفكرة',now()
),
(
  'coffee-cup-seat','قاعد بالقهوة','مشهد مبالغ فيه: فنجان القهوة يتحول إلى مكان جلوس.','شخص يجلس داخل فنجان قهوة عربي عملاق في لقطة ساخرة قابلة للمشاركة.','comedy','image','published',86,'Brand Box editorial','Oversized object / literal phrase visual','أنشئ مشهدًا فوتوغرافيًا سرياليًا لشخص عربي {{الشخصية}} يجلس باسترخاء داخل فنجان قهوة عربي عملاق مزخرف وممتلئ بالقهوة، يمسك دلة نحاسية، بخار خفيف واقعي، خلفية مقهى ليلي بإضاءة دافئة، منظور أمامي، تفاصيل عالية، إحساس فكاهي راقٍ، بدون نص أو شعار.','حروق، إصابات، تشوه اليدين، نص، علامة مائية','[{"key":"الشخصية","label":"الشخصية","placeholder":"مثال: رجل عربي بثوب أبيض","required":true,"maxLength":160}]'::jsonb,'image generation',array['4:5','9:16'],false,'قاعد بالقهوة؟ خلّينا نخليها حرفيًا ☕','جرّب هذا الترند',now()
),
(
  'inside-fridge-pov','POV من داخل الثلاجة','زاوية كاميرا غير متوقعة تصنع لقطة يومية قابلة للانتشار.','الكاميرا داخل الثلاجة والشخص يفتح الباب وينظر مباشرة نحو العدسة مع عدسة واسعة وتفاصيل واقعية.','social','image','published',79,'Brand Box editorial','POV camera placement / fridge interior','لقطة فوتوغرافية بزاوية POV من داخل ثلاجة مفتوحة، عدسة واسعة جدًا، شخص عربي {{الشخصية}} يفتح الباب ويمد يده نحو الكاميرا، رفوف وزجاجات وفاكهة حول إطار الصورة، ضوء الثلاجة البارد يقابل إضاءة المنزل الدافئة، منظور واقعي ديناميكي، تفاصيل طبيعية، بدون نص أو شعار.','تشوه اليد، وجه غير طبيعي، ملصقات مقروءة، نص عشوائي، علامة مائية','[{"key":"الشخصية","label":"وصف الشخصية","placeholder":"مثال: سيدة عربية كبيرة بالسن بعباءة سوداء","required":true,"maxLength":180}]'::jsonb,'image generation',array['4:5','9:16'],false,'زاوية واحدة تغيّر الصورة كلها: POV من داخل الثلاجة 👀','استخدم الزاوية',now()
),
(
  'giant-city-person','عملاق فوق المدينة','تغيير الحجم لخلق لقطة سينمائية توقف التمرير.','شخص بحجم عملاق يقف بين معالم مدينة مع الحفاظ على واقعية الضوء والمنظور.','commercial','image','published',80,'Brand Box editorial','Giant-scale city composite','أنشئ مشهدًا فوتوغرافيًا سينمائيًا لشخص عربي {{الشخصية}} بحجم عملاق يقف بين مباني مدينة {{المدينة}}، مع منظور وإضاءة واحتكاك بصري واقعي بين الشخص والعمارة، وقت الغروب، تفاصيل دقيقة، إحساس إعلان CGI فاخر، بدون نص أو شعارات.','تشوه المباني، أطراف إضافية، نص، علامة مائية، مقياس غير منطقي بلا منظور','[{"key":"الشخصية","label":"الشخصية","placeholder":"مثال: سيدة عربية أنيقة بعباءة سوداء","required":true,"maxLength":180},{"key":"المدينة","label":"المدينة","placeholder":"مثال: طرابلس أو دبي أو نيويورك","required":true,"maxLength":80}]'::jsonb,'image generation',array['4:5','9:16'],false,'خلّ شخصيتك أكبر من المدينة نفسها.','ابنِ المشهد',now()
),
(
  'product-giant-world','المنتج العملاق','حوّل المنتج إلى بطل مشهد CGI قابل للإعلان.','قالب تجاري يجعل المنتج ضخمًا داخل مدينة أو بيئة مرتبطة باستخدامه مع تكوين مناسب للـReels والبوستات.','products','image','published',91,'Brand Box editorial','Oversized product CGI advertising','أنشئ إعلان CGI فوتوغرافي فاخر لمنتج {{المنتج}} بحجم عملاق داخل {{المكان}}. اجعل المنتج متكاملًا واقعيًا مع البيئة، انعكاسات وظلال صحيحة، أشخاص أو مركبات صغيرة تمنح إحساسًا بالحجم، حركة وإضاءة إعلانية قوية، مساحة آمنة لإضافة عنوان وشعار لاحقًا، بدون نص مولد داخل الصورة.','نص عشوائي، شعار مزيف، منتج مشوه، منظور خاطئ، علامة مائية','[{"key":"المنتج","label":"المنتج","placeholder":"مثال: علبة مشروب أو عطر أو هاتف","required":true,"maxLength":120},{"key":"المكان","label":"البيئة","placeholder":"مثال: وسط مدينة حديثة أو شاطئ أو محطة وقود","required":true,"maxLength":140}]'::jsonb,'image generation',array['4:5','9:16','1:1'],false,'لو منتجك صار بحجم مدينة... كيف سيبدو؟ 🔥','حوّل منتجك',now()
),
(
  'phrase-to-visual','حوّل عبارتك إلى مشهد','قالب Evergreen للأمثال والتعبيرات العربية والليبية.','اكتب تعبيرًا دارجًا وسنحوّله إلى تصور بصري حرفي ذكي يصلح للميمز والمحتوى الاجتماعي.','evergreen','image','evergreen',92,'Brand Box original','Arabic/Libyan phrase visualizer','حوّل التعبير العربي التالي إلى مشهد بصري حرفي مبتكر وقابل للفهم فورًا: {{العبارة}}. استخدم شخصية عربية وبيئة مناسبة للمعنى، فكرة سريالية واحدة واضحة، تصوير فوتوغرافي واقعي أو CGI واقعي حسب الحاجة، تكوين بسيط يركز على النكتة البصرية، إضاءة سينمائية، بدون كتابة العبارة داخل الصورة وبدون شعارات.','نص داخل الصورة، علامة مائية، ازدحام بصري، تشوه الوجه أو اليدين','[{"key":"العبارة","label":"العبارة أو المثل","placeholder":"مثال: الشغل واكلني / فلوسي طارت / الدنيا مقلوبة","required":true,"maxLength":140}]'::jsonb,'image generation',array['4:5','9:16'],false,'اكتب عبارتك... وخلّ Brand Box يحولها إلى صورة.','حوّل عبارتك',now()
)
on conflict (slug) do nothing;
