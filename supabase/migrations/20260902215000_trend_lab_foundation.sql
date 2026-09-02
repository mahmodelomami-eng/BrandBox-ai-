create table if not exists public.trend_briefs (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 3 and 160),
  concept text not null check (char_length(concept) between 10 and 2000),
  audience text,
  content_angle text,
  source_platform text not null default 'internal' check (source_platform in ('internal','tiktok','instagram','facebook','youtube','pinterest','reddit','x','web')),
  source_url text,
  source_note text,
  score_viral smallint not null default 0 check (score_viral between 0 and 100),
  score_shareability smallint not null default 0 check (score_shareability between 0 and 100),
  score_ai_fit smallint not null default 0 check (score_ai_fit between 0 and 100),
  score_arabic_fit smallint not null default 0 check (score_arabic_fit between 0 and 100),
  score_brand_fit smallint not null default 0 check (score_brand_fit between 0 and 100),
  score_commercial_fit smallint not null default 0 check (score_commercial_fit between 0 and 100),
  trend_score numeric(5,2) not null default 0 check (trend_score between 0 and 100),
  workflow_status text not null default 'discovered' check (workflow_status in ('discovered','shortlisted','designing','testing','approved','rejected','published')),
  discovered_by text not null default 'trend-intelligence-agent',
  discovered_at timestamptz not null default now(),
  reviewed_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.trend_templates (
  id uuid primary key default gen_random_uuid(),
  brief_id uuid references public.trend_briefs(id) on delete set null,
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  title_ar text not null check (char_length(title_ar) between 3 and 120),
  subtitle_ar text not null check (char_length(subtitle_ar) between 3 and 220),
  description_ar text not null check (char_length(description_ar) between 10 and 1200),
  category text not null check (category in ('now','personal','comedy','social','commercial','products','video','occasions','arabic','evergreen')),
  tool text not null check (tool in ('images','video')),
  generation_mode text not null check (generation_mode in ('text_to_image','reference_image','text_to_video','image_to_video')),
  readiness text not null default 'live' check (readiness in ('live','requires_reference','draft')),
  lifecycle text not null default 'trending' check (lifecycle in ('trending','evergreen','archived')),
  prompt_template text not null check (char_length(prompt_template) between 20 and 8000),
  negative_prompt text check (negative_prompt is null or char_length(negative_prompt) <= 2000),
  required_inputs jsonb not null default '[]'::jsonb,
  tags text[] not null default '{}',
  model_hint text,
  aspect_ratio text not null default '9:16' check (aspect_ratio in ('1:1','4:3','3:4','16:9','9:16')),
  preview_kind text not null default 'gradient' check (preview_kind in ('gradient','image','video')),
  preview_url text,
  preview_gradient text not null default 'linear-gradient(145deg,#1b1d24,#0b0c10)',
  trend_score numeric(5,2) not null default 0 check (trend_score between 0 and 100),
  use_count bigint not null default 0 check (use_count >= 0),
  is_featured boolean not null default false,
  is_published boolean not null default false,
  published_at timestamptz,
  expires_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.trend_usage_events (
  id uuid primary key default gen_random_uuid(),
  trend_id uuid not null references public.trend_templates(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  event_type text not null check (event_type in ('open','use','share')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists trend_templates_published_score_idx
  on public.trend_templates (is_published, lifecycle, trend_score desc, published_at desc);
create index if not exists trend_templates_category_idx
  on public.trend_templates (category, is_published, trend_score desc);
create index if not exists trend_briefs_workflow_idx
  on public.trend_briefs (workflow_status, trend_score desc, discovered_at desc);
create index if not exists trend_usage_events_trend_created_idx
  on public.trend_usage_events (trend_id, created_at desc);
create index if not exists trend_usage_events_user_created_idx
  on public.trend_usage_events (user_id, created_at desc) where user_id is not null;

alter table public.trend_briefs enable row level security;
alter table public.trend_templates enable row level security;
alter table public.trend_usage_events enable row level security;

revoke all on public.trend_briefs from anon, authenticated;
revoke all on public.trend_templates from anon, authenticated;
revoke all on public.trend_usage_events from anon, authenticated;

-- Trend Lab is served through audited server routes only. Browser roles get no direct writes.

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'trend_templates_updated_at_trigger') then
    create function public.set_trend_template_updated_at()
    returns trigger
    language plpgsql
    set search_path = public
    as $fn$
    begin
      new.updated_at := now();
      return new;
    end;
    $fn$;
    create trigger trend_templates_updated_at_trigger
      before update on public.trend_templates
      for each row execute function public.set_trend_template_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'trend_briefs_updated_at_trigger') then
    create function public.set_trend_brief_updated_at()
    returns trigger
    language plpgsql
    set search_path = public
    as $fn$
    begin
      new.updated_at := now();
      return new;
    end;
    $fn$;
    create trigger trend_briefs_updated_at_trigger
      before update on public.trend_briefs
      for each row execute function public.set_trend_brief_updated_at();
  end if;
end $$;

revoke all on function public.set_trend_template_updated_at() from public, anon, authenticated;
revoke all on function public.set_trend_brief_updated_at() from public, anon, authenticated;

insert into public.trend_templates (
  slug,title_ar,subtitle_ar,description_ar,category,tool,generation_mode,readiness,lifecycle,
  prompt_template,negative_prompt,required_inputs,tags,aspect_ratio,preview_gradient,trend_score,is_featured,is_published,published_at
) values
(
  'arabic-idiom-literal-world',
  'حوّل التعبير العربي إلى مشهد حرفي',
  'فكرة لغوية مألوفة تتحول إلى صورة مفاجئة وقابلة للمشاركة.',
  'اكتب تعبيرًا عربيًا أو ليبيًا، وحوّله إلى تنفيذ بصري حرفي ساخر لكن أنيق، مع مساحة للنص النهائي خارج الصورة.',
  'arabic','images','text_to_image','live','trending',
  'Create a highly realistic, witty visual interpretation of the Arabic expression: {{expression}}. Convert the metaphor into a literal cinematic scene while keeping it culturally respectful and instantly understandable to an Arabic audience. Subject: {{subject}}. Premium social-media photography, strong focal point, realistic materials, controlled humor, clean composition, vertical poster framing, no generated text or logos.',
  'random text, watermark, logo, deformed hands, unreadable typography, low detail',
  '[{"key":"expression","label":"التعبير أو الجملة","type":"text","required":true,"placeholder":"مثال: طاير من الفرحة"},{"key":"subject","label":"الشخص أو الموضوع","type":"text","required":true,"placeholder":"مثال: شاب ليبي بالزي التقليدي"}]'::jsonb,
  array['عربي','ليبي','كوميدي','تعبيرات','social'], '9:16',
  'radial-gradient(circle at 70% 20%,rgba(243,19,37,.42),transparent 30%),linear-gradient(145deg,#1d1114,#08090c 65%)',
  94,true,true,now()
),
(
  'giant-product-city',
  'منتج عملاق داخل المدينة',
  'إعلان CGI سريع للمنتجات والعلامات التجارية.',
  'حوّل المنتج إلى عنصر ضخم يندمج مع مدينة أو معلم بطريقة واقعية ومناسبة لحملات السوشيال.',
  'products','images','text_to_image','live','trending',
  'Create a premium CGI advertising scene for {{product}} as a monumental oversized object integrated naturally into {{location}}. Photorealistic scale, realistic shadows and reflections, people and vehicles provide scale, cinematic daylight, premium commercial art direction, brand-safe composition, leave negative space for Arabic campaign copy, no generated text or logos.',
  'warped product shape, random branding, unreadable text, low resolution, impossible reflections',
  '[{"key":"product","label":"المنتج","type":"text","required":true,"placeholder":"مثال: علبة مشروب طاقة حمراء"},{"key":"location","label":"المكان","type":"text","required":true,"placeholder":"مثال: كورنيش بنغازي وقت الغروب"}]'::jsonb,
  array['CGI','منتجات','إعلان','commercial'], '9:16',
  'radial-gradient(circle at 34% 32%,rgba(243,19,37,.48),transparent 28%),linear-gradient(150deg,#251014,#090a0d 68%)',
  92,true,true,now()
),
(
  'pov-inside-object',
  'POV من داخل الشيء',
  'زاوية كاميرا غير متوقعة تجعل المشهد يوقف التمرير.',
  'اختر جسمًا مثل ثلاجة أو حقيبة أو كوب، وشاهد الشخصية من داخله بزاوية واسعة جذابة.',
  'now','images','text_to_image','live','trending',
  'POV camera placed inside {{object}}, looking outward as {{character}} reaches toward the camera. Ultra-wide lens, believable interior framing around the edges, expressive but natural face, realistic environment: {{environment}}, crisp commercial photography, playful social-media energy, strong depth, no generated text or logos.',
  'fisheye face distortion, extra fingers, random labels, text, watermark',
  '[{"key":"object","label":"مكان الكاميرا","type":"text","required":true,"placeholder":"مثال: ثلاجة مفتوحة"},{"key":"character","label":"الشخصية","type":"text","required":true,"placeholder":"مثال: سيدة ليبية أنيقة"},{"key":"environment","label":"المكان","type":"text","required":true,"placeholder":"مثال: مطبخ عصري بإضاءة دافئة"}]'::jsonb,
  array['POV','ترند','كاميرا','lifestyle'], '9:16',
  'radial-gradient(circle at 50% 18%,rgba(255,255,255,.22),transparent 26%),linear-gradient(150deg,#122c36,#07090d 70%)',
  90,false,true,now()
),
(
  'surreal-scale-social',
  'مبالغة الحجم للمحتوى الاجتماعي',
  'مشهد بسيط يتحول إلى لقطة سريالية قوية.',
  'ضع شخصية أو عنصرًا بحجم غير منطقي داخل بيئة يومية لصناعة مشهد ترفيهي أو دعائي قابل للمشاركة.',
  'social','images','text_to_image','live','trending',
  'Create a surreal but photorealistic social-media scene where {{subject}} is dramatically {{scale_direction}} inside {{environment}}. Keep physical interaction, contact shadows, perspective and lighting believable. Editorial photography, humorous but premium, Arabic-market visual sensibility, vertical composition, no generated text.',
  'cartoon look, floating without shadows, random text, deformed anatomy',
  '[{"key":"subject","label":"الموضوع","type":"text","required":true,"placeholder":"مثال: رجل يحمل كوب قهوة"},{"key":"scale_direction","label":"المبالغة","type":"text","required":true,"placeholder":"مثال: صغير جدًا داخل كوب عملاق"},{"key":"environment","label":"البيئة","type":"text","required":true,"placeholder":"مثال: مقهى ليلي فاخر"}]'::jsonb,
  array['سريالي','كوميدي','social'], '9:16',
  'radial-gradient(circle at 72% 35%,rgba(243,19,37,.32),transparent 30%),linear-gradient(145deg,#1a1b22,#08090c 70%)',
  88,false,true,now()
),
(
  'cinematic-local-moment',
  'لحظة محلية بأسلوب سينمائي',
  'حوّل موقفًا يوميًا عربيًا إلى إعلان أو بوستر فني.',
  'مفيد للصفحات التجارية والمحتوى الاجتماعي الذي يريد طابعًا محليًا بدون فقد الجودة البصرية.',
  'evergreen','images','text_to_image','live','evergreen',
  'Create a cinematic editorial photograph of {{moment}} in {{city_or_place}}. Authentic Arabic/North African details, premium natural wardrobe, realistic architecture and props, expressive composition, warm practical lighting, 35mm photography feel, contemporary advertising polish, no stereotypes, no generated text or logos.',
  'tourist cliché, random flags, text, watermark, low detail',
  '[{"key":"moment","label":"الموقف","type":"text","required":true,"placeholder":"مثال: أصدقاء يتقابلون بعد العمل أمام مقهى"},{"key":"city_or_place","label":"المكان","type":"text","required":true,"placeholder":"مثال: وسط بنغازي مساءً"}]'::jsonb,
  array['محلي','سينمائي','إعلاني','evergreen'], '4:3',
  'radial-gradient(circle at 24% 25%,rgba(255,180,90,.34),transparent 30%),linear-gradient(145deg,#24170f,#090a0d 70%)',
  83,false,true,now()
),
(
  'product-world-building',
  'عالم كامل من المنتج',
  'ابنِ مشهدًا ترويجيًا تصبح فيه هوية المنتج هي البيئة نفسها.',
  'قالب تجاري لإنشاء عالم بصري حول لون المنتج وخامته واستخدامه بدون نسخ أي حملة موجودة.',
  'commercial','images','text_to_image','live','evergreen',
  'Build an original branded fantasy world inspired by the physical qualities of {{product}}: color palette {{palette}}, material cues {{materials}}, use case {{use_case}}. The product remains recognizable as the hero object while architecture, landscape and props echo its design language. Premium campaign CGI, realistic light, clean brand-safe composition, no generated logos or text.',
  'copyrighted characters, existing brand campaign imitation, random logo, text artifacts',
  '[{"key":"product","label":"المنتج","type":"text","required":true,"placeholder":"مثال: عطر أسود بغطاء معدني"},{"key":"palette","label":"الألوان","type":"text","required":true,"placeholder":"مثال: أسود، أحمر، كروم"},{"key":"materials","label":"الخامات","type":"text","required":true,"placeholder":"مثال: زجاج، معدن مصقول، دخان"},{"key":"use_case","label":"الاستخدام","type":"text","required":true,"placeholder":"مثال: حملة إطلاق فاخرة"}]'::jsonb,
  array['منتجات','branding','CGI','campaign'], '9:16',
  'radial-gradient(circle at 45% 30%,rgba(243,19,37,.38),transparent 28%),linear-gradient(135deg,#141414,#050506 72%)',
  86,false,true,now()
),
(
  'mini-me-reference',
  'نسخة مصغرة منك',
  'ترند شخصي يعتمد على الحفاظ على هوية الصورة المرجعية.',
  'نسخة مصغرة من الشخص تتفاعل مع نسخته الأساسية؛ محفوظ في Trend Lab وجاهز للتفعيل عند اكتمال مسار الصور المرجعية في أداة الصور.',
  'personal','images','reference_image','requires_reference','trending',
  'Using the uploaded reference portrait, preserve facial identity and wardrobe. Create a surreal photorealistic portrait where a miniature version of the same person interacts with the full-size version in a clever physically believable way. Consistent identity, matching lighting, realistic contact shadows, premium editorial photography, no text or logos.',
  'identity drift, different person, extra limbs, random text, watermark',
  '[{"key":"reference_image","label":"صورتك المرجعية","type":"image","required":true}]'::jsonb,
  array['صورة شخصية','mini-me','reference'], '9:16',
  'radial-gradient(circle at 55% 28%,rgba(243,19,37,.4),transparent 26%),linear-gradient(145deg,#15171d,#08090c 68%)',
  95,true,true,now()
),
(
  'cinematic-motion-reveal',
  'Reveal سينمائي قصير',
  'فكرة فيديو جاهزة لافتتاح المنتجات أو الخدمات.',
  'حركة دخول سريعة من الظلام إلى المشهد الرئيسي مع كاميرا محسوبة، مناسبة لريلز الإعلانات والافتتاحات.',
  'video','video','text_to_video','live','trending',
  'Vertical cinematic reveal of {{subject}}. Begin with an abstract macro detail in darkness, then a smooth fast camera pull-back reveals the full {{subject}} in {{environment}}. Controlled particles, premium commercial lighting, realistic motion, strong final hero frame with negative space for post-production Arabic copy. Duration 5-8 seconds. No generated text or logos.',
  null,
  '[{"key":"subject","label":"ما الذي سيظهر؟","type":"text","required":true,"placeholder":"مثال: سيارة رياضية سوداء"},{"key":"environment","label":"المكان","type":"text","required":true,"placeholder":"مثال: استوديو أحمر وأسود ضبابي"}]'::jsonb,
  array['فيديو','reveal','إعلان','ريلز'], '9:16',
  'radial-gradient(circle at 50% 45%,rgba(243,19,37,.5),transparent 28%),linear-gradient(180deg,#151015,#030304 74%)',
  89,true,true,now()
)
on conflict (slug) do nothing;

insert into public.trend_briefs (
  title,concept,audience,content_angle,source_platform,source_note,
  score_viral,score_shareability,score_ai_fit,score_arabic_fit,score_brand_fit,score_commercial_fit,trend_score,workflow_status
) values
('الأمثال والتعبيرات بصريًا','تحويل التعبير العربي إلى تنفيذ حرفي أصلي قابل للتخصيص بدل نسخ برومبت متداول.','الجمهور العربي العام','ترفيهي + اجتماعي + قابل للتحويل لإعلانات','internal','Brand Box original adaptation of a common public trend mechanic.',95,94,92,100,96,78,93.15,'published'),
('POV من أماكن غير متوقعة','وضع الكاميرا داخل ثلاجة أو حقيبة أو كوب أو صندوق وإظهار الشخصية وهي تتفاعل مع العدسة.','محتوى شخصي وتجاري','ترفيهي + منتجات + lifestyle','internal','Original Brand Box execution; no source prompt copied.',88,91,94,90,91,84,89.65,'published'),
('CGI المنتج العملاق','المنتج يصبح معلمًا ضخمًا داخل مدينة مع منظور وظلال واقعية.','علامات تجارية ومتاجر','ترويجي وتجاري','internal','Evergreen commercial trend adapted into an original reusable template.',91,88,96,80,97,100,91.80,'published'),
('نسخة مصغرة من الشخص','شخصية مصغرة تتفاعل مع النسخة الأصلية مع الحفاظ على الهوية.','محتوى شخصي ومؤثرون','ترفيهي وشخصي','internal','Queued until reference-image generation is technically enabled.',98,97,90,88,90,72,91.60,'designing');
