'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createUserProject } from '../lib/projects/projects-service';
import { useAuth } from '../context/AuthContext';
import {
  ArrowLeft,
  BadgeCheck,
  Building2,
  ChevronDown,
  ChevronUp,
  Clock3,
  FileText,
  Film,
  Flame,
  Gift,
  Image as ImageIcon,
  Layers3,
  Megaphone,
  MessageSquare,
  Mic2,
  Package,
  Palette,
  Play,
  Search,
  ShoppingBag,
  Sparkles,
  Utensils,
  Video,
  Wand2,
  Zap,
} from 'lucide-react';

const MOBILE_INITIAL_LIMIT = 6;

const QUICK_FIELDS = {
  'product-hero': [{ token: '[اسم المنتج]', label: 'اسم المنتج', placeholder: 'مثال: عطر Noir', required: true, maxLength: 80 }],
  'ecommerce-offer': [{ token: '[اسم المنتج]', label: 'اسم المنتج أو العرض', placeholder: 'مثال: سماعات AirBeat', required: true, maxLength: 80 }],
  'restaurant-hero': [{ token: '[اسم الطبق]', label: 'اسم الطبق', placeholder: 'مثال: برغر سموكي', required: true, maxLength: 80 }],
  'real-estate-launch': [{ token: '[اسم المشروع العقاري]', label: 'اسم المشروع', placeholder: 'مثال: أبراج النخبة', required: true, maxLength: 100 }],
  'greeting-card': [{ token: '[اسم المناسبة]', label: 'المناسبة', placeholder: 'مثال: عيد الفطر المبارك', required: true, maxLength: 100 }],
  'job-vacancy-visual': [{ token: '[المسمى الوظيفي]', label: 'المسمى الوظيفي', placeholder: 'مثال: مصمم جرافيك', required: true, maxLength: 100 }],
  'campaign-copy-pack': [
    { token: '[المنتج/الخدمة]', label: 'المنتج أو الخدمة', placeholder: 'مثال: خدمة إدارة حسابات السوشيال', required: true, maxLength: 120 },
    { token: '[وصف الجمهور]', label: 'الجمهور المستهدف', placeholder: 'مثال: أصحاب المشاريع الصغيرة في ليبيا', required: true, maxLength: 160 },
  ],
  'carousel-educational': [{ token: '[الموضوع]', label: 'موضوع الكاروسيل', placeholder: 'مثال: 5 أخطاء في التسويق للمطاعم', required: true, maxLength: 180 }],
  'service-reel': [{ token: '[اسم الخدمة]', label: 'اسم الخدمة', placeholder: 'مثال: تنظيف وتلميع السيارات', required: true, maxLength: 120 }],
  'product-reel': [{ token: '[اسم المنتج]', label: 'اسم المنتج', placeholder: 'مثال: ساعة Nova', required: true, maxLength: 80 }],
  'restaurant-reel': [
    { token: '[اسم المطعم]', label: 'اسم المطعم', placeholder: 'مثال: مطعم Brand Grill', required: true, maxLength: 100 },
    { token: '[الطبق]', label: 'الطبق الرئيسي', placeholder: 'مثال: ستيك مشوي', required: true, maxLength: 100 },
  ],
  'article-voiceover': [{ token: '[الصق المقال أو النص هنا]', label: 'النص أو المقال', placeholder: 'الصق النص الذي تريد تحويله إلى تعليق صوتي...', required: true, multiline: true, maxLength: 3500 }],
  'promo-voiceover': [{ token: '[اكتب النص]', label: 'النص الإعلاني', placeholder: 'اكتب نص الإعلان الذي تريد أداءه صوتيًا...', required: true, multiline: true, maxLength: 1000 }],
};

const TOOL_META = {
  images: { label: 'الصور AI', projectType: 'صورة', path: '/projects/images/workspace', icon: ImageIcon },
  chat: { label: 'الشات AI', projectType: 'محادثة', path: '/projects/chat/workspace', icon: MessageSquare },
  video: { label: 'الفيديو AI', projectType: 'فيديو', path: '/projects/video/workspace', icon: Video },
  audio: { label: 'الصوت AI', projectType: 'صوت', path: '/projects/audio/workspace', icon: Mic2 },
};

const STATUS_META = {
  active: { label: 'فعّال الآن', button: 'جرّب الآن', className: 'border-[var(--bb-success)] bg-[var(--bb-success-soft)] text-[var(--bb-success)]' },
  draft: { label: 'جهّز الآن', button: 'جهّز المسودة', className: 'border-[var(--bb-warning)] bg-[var(--bb-warning-soft)] text-[var(--bb-warning)]' },
  reference: { label: 'يتطلب صورة مرجعية', button: 'قريبًا — رفع صورة', className: 'bb-button-secondary bb-text-tertiary' },
};

const CATEGORIES = [
  { id: 'all', label: 'الكل', icon: Layers3 },
  { id: 'images', label: 'صور', icon: ImageIcon },
  { id: 'products', label: 'منتجات', icon: Package },
  { id: 'reels', label: 'ريلز', icon: Film },
  { id: 'marketing', label: 'تسويق', icon: Megaphone },
  { id: 'occasions', label: 'مناسبات', icon: Gift },
  { id: 'writing', label: 'كتابة', icon: FileText },
  { id: 'audio', label: 'صوت', icon: Mic2 },
];

const TEMPLATES = [
  {
    id: 'product-hero',
    title: 'إعلان منتج Hero فاخر',
    subtitle: 'حوّل فكرة المنتج إلى لقطة إعلانية تستحق الحملة.',
    description: 'مشهد تجاري قوي يضع المنتج في المركز مع إضاءة استوديو، خامات واقعية ومساحة ذكية للنص والسعر.',
    groups: ['images', 'products', 'marketing'],
    tags: ['منتج', 'إعلان', 'ecommerce', 'commercial'],
    tool: 'images', status: 'active', featured: true, industry: 'التجارة والمنتجات',
    icon: Package, accent: '#ff3344', image: 'https://images.unsplash.com/photo-1778003386159-93d37cd94e82?auto=format&fit=crop&w=1400&q=85', preview: 'radial-gradient(circle at 68% 28%,rgba(255,51,68,.42),transparent 32%),linear-gradient(145deg,#201014,#090a0e 64%)',
    prompt: 'أنشئ إعلان منتج تجاري فاخر لمنتج [اسم المنتج]. اجعل المنتج هو العنصر الرئيسي في مركز المشهد، تصوير استوديو واقعي جدًا، إضاءة حواف درامية، انعكاسات محسوبة، خامات دقيقة، خلفية نظيفة راقية مرتبطة بفئة المنتج، تكوين إعلاني premium مع مساحة سلبية مناسبة لإضافة عنوان عربي قصير وسعر وشعار. لا تضع نصوصًا عشوائية داخل الصورة.',
    style: 'photo', aspect: '4:3', time: 'أقل من دقيقة', result: 'صورة إعلان منتج',
  },
  {
    id: 'ecommerce-offer',
    title: 'عرض متجر يوقف التمرير',
    subtitle: 'منشور تخفيضات واضح وسريع للسوشيال.',
    description: 'قالب بصري للبيع المباشر: المنتج، العرض، الإحساس بالحركة ومساحة قوية لنسبة الخصم والـCTA.',
    groups: ['images', 'products', 'marketing'],
    tags: ['تخفيضات', 'متجر', 'عرض', 'social'],
    tool: 'images', status: 'active', featured: false, industry: 'التجارة الإلكترونية',
    icon: ShoppingBag, accent: '#ff5b35', image: 'https://images.unsplash.com/photo-1783700696433-13d2c2f0bcc0?auto=format&fit=crop&w=1400&q=85', preview: 'radial-gradient(circle at 26% 35%,rgba(255,91,53,.45),transparent 30%),linear-gradient(135deg,#2b1410,#090a0e 65%)',
    prompt: 'صمم خلفية إعلان تخفيضات حديثة لمنتج [اسم المنتج] مخصصة لمنشور اجتماعي. لقطة منتج نظيفة وعالية التفاصيل، إحساس ديناميكي وحركة خفيفة، تباين قوي، مساحة واضحة لعرض السعر القديم والجديد ونسبة الخصم وزر دعوة لاتخاذ إجراء. أسلوب تجاري معاصر وغير مزدحم، بدون كتابة نصوص وهمية.',
    style: 'formal', aspect: '1:1', time: 'أقل من دقيقة', result: 'بوستر عرض تجاري',
  },
  {
    id: 'restaurant-hero',
    title: 'طبق مطعم سينمائي',
    subtitle: 'لقطة شهية للإعلانات والمنيو والسوشيال.',
    description: 'إضاءة طعام احترافية، بخار وتفاصيل محسوبة وتكوين يجعل الطبق هو البطل بدون فوضى بصرية.',
    groups: ['images', 'marketing'],
    tags: ['مطعم', 'طعام', 'food', 'menu'],
    tool: 'images', status: 'active', featured: false, industry: 'المطاعم والمقاهي',
    icon: Utensils, accent: '#ff7a32', image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=1400&q=85', preview: 'radial-gradient(circle at 62% 38%,rgba(255,122,50,.4),transparent 34%),linear-gradient(145deg,#23150d,#08090d 66%)',
    prompt: 'أنشئ لقطة إعلان طعام سينمائية لطبق [اسم الطبق]. تصوير food photography احترافي، إضاءة دافئة جانبية، تفاصيل شهية وواقعية، بخار خفيف عند ملاءمته، خلفية مطعم راقية خارج التركيز، عمق ميدان ضحل، تكوين مناسب لإعلان Instagram مع مساحة لاسم الطبق والسعر والشعار، بدون نصوص داخل الصورة.',
    style: 'cinematic', aspect: '4:3', time: 'أقل من دقيقة', result: 'صورة طعام احترافية',
  },
  {
    id: 'real-estate-launch',
    title: 'إطلاق مشروع عقاري',
    subtitle: 'مشهد معماري Premium للعرض والاستثمار.',
    description: 'مناسب للمطورين والمكاتب: عقار واضح، وقت ذهبي، طابع استثماري ومساحة للمزايا والسعر.',
    groups: ['images', 'marketing'],
    tags: ['عقار', 'مبنى', 'real estate', 'استثمار'],
    tool: 'images', status: 'active', featured: false, industry: 'العقارات',
    icon: Building2, accent: '#d7b474', image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1400&q=85', preview: 'radial-gradient(circle at 70% 22%,rgba(215,180,116,.34),transparent 28%),linear-gradient(145deg,#171714,#090a0d 68%)',
    prompt: 'أنشئ مشهدًا معماريًا إعلانيًا فاخرًا لمشروع [اسم المشروع العقاري]، عمارة حديثة واقعية وقت الغروب، إضاءة ذهبية، تنسيق خارجي أنيق، منظور واسع يوحي بالقيمة والاستثمار، جودة visualization عالية، مساحة نظيفة لعنوان المشروع والموقع والمزايا ووسيلة التواصل، بدون كتابة مولدة داخل الصورة.',
    style: 'formal', aspect: '16:9', time: 'أقل من دقيقة', result: 'إعلان عقاري فاخر',
  },
  {
    id: 'greeting-card',
    title: 'بطاقة معايدة بهوية العلامة',
    subtitle: 'تهنئة أنيقة للأعياد والمناسبات الرسمية.',
    description: 'اتجاه بصري عربي راقٍ وقابل للتخصيص بألوان المؤسسة مع مساحة للعبارة والشعار.',
    groups: ['images', 'occasions'],
    tags: ['معايدة', 'عيد', 'مناسبة', 'greeting'],
    tool: 'images', status: 'active', featured: true, industry: 'عام',
    icon: Gift, accent: '#e1b969', image: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=1400&q=85', preview: 'radial-gradient(circle at 28% 30%,rgba(225,185,105,.32),transparent 29%),linear-gradient(145deg,#1b1710,#08090d 70%)',
    prompt: 'صمم خلفية بطاقة معايدة عربية فاخرة بمناسبة [اسم المناسبة] لعلامة تجارية. زخارف هندسية عربية معاصرة راقية وغير مزدحمة، إضاءة ناعمة، إحساس احتفالي premium، مساحة مركزية واضحة لعبارة التهنئة ومساحة منفصلة للشعار، قابل للتلوين بهوية العلامة، بدون نصوص عشوائية داخل التصميم.',
    style: 'formal', aspect: '1:1', time: 'أقل من دقيقة', result: 'بطاقة معايدة',
  },
  {
    id: 'job-vacancy-visual',
    title: 'إعلان توظيف حديث',
    subtitle: 'Visual نظيف للوظائف الشاغرة.',
    description: 'خلفية مؤسسية جذابة تصلح لـLinkedIn وInstagram مع بنية واضحة لاسم الوظيفة والمتطلبات.',
    groups: ['images', 'marketing'],
    tags: ['وظيفة', 'توظيف', 'job', 'linkedin'],
    tool: 'images', status: 'active', featured: false, industry: 'الأعمال',
    icon: Megaphone, accent: '#ff3344', image: 'https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=1400&q=85', preview: 'radial-gradient(circle at 22% 74%,rgba(255,51,68,.3),transparent 30%),linear-gradient(145deg,#11141a,#08090d 70%)',
    prompt: 'أنشئ خلفية إعلان توظيف احترافية لوظيفة [المسمى الوظيفي] في شركة حديثة. أسلوب corporate معاصر، شخصية مهنية أو بيئة عمل مناسبة عند الحاجة، تكوين نظيف جدًا ومساحات مقروءة لاسم الوظيفة والمتطلبات وطريقة التقديم، مناسب لـLinkedIn وInstagram، بدون نصوص مولدة داخل الصورة.',
    style: 'minimal', aspect: '1:1', time: 'أقل من دقيقة', result: 'Visual توظيف',
  },
  {
    id: 'campaign-copy-pack',
    title: 'حزمة إطلاق منتج كاملة',
    subtitle: 'من فكرة واحدة إلى منشورات وعناوين وCTA.',
    description: 'الشات يبني لك رسالة الحملة: القيمة، 5 عناوين، 5 منشورات، Story hooks وCTA قابلة للاختبار.',
    groups: ['writing', 'products', 'marketing'],
    tags: ['copywriting', 'منتج', 'حملة', 'منشورات'],
    tool: 'chat', status: 'active', featured: true, industry: 'التسويق',
    icon: MessageSquare, accent: '#a66cff', preview: 'radial-gradient(circle at 70% 25%,rgba(166,108,255,.35),transparent 30%),linear-gradient(145deg,#16101f,#08090d 68%)',
    prompt: 'أنت كاتب إعلانات عربي محترف. أريد إطلاق [المنتج/الخدمة] للجمهور [وصف الجمهور]. ابنِ حزمة حملة عملية تتضمن: الوعد الرئيسي، زاوية الحملة، 5 عناوين إعلانية مختلفة، 5 نصوص منشورات قصيرة، 5 Hooks للريلز والستوري، 3 دعوات CTA، واعتراضات العملاء الأكثر احتمالًا مع رد مختصر لكل منها. اجعل اللغة عربية طبيعية ومقنعة وتجنب المبالغة والادعاءات غير المثبتة.',
    time: '2–3 دقائق', result: 'Copy Pack للحملة',
  },
  {
    id: 'carousel-educational',
    title: 'كاروسيل تعليمي من 7 شرائح',
    subtitle: 'حوّل موضوعًا معقدًا إلى محتوى سهل الحفظ والمشاركة.',
    description: 'هيكل جاهز: Hook، نقاط تعليمية، مثال، خطأ شائع، خلاصة وCTA.',
    groups: ['writing', 'marketing'],
    tags: ['carousel', 'تعليمي', 'انستغرام', 'محتوى'],
    tool: 'chat', status: 'active', featured: false, industry: 'المحتوى',
    icon: Layers3, accent: '#4a9eff', preview: 'radial-gradient(circle at 24% 28%,rgba(74,158,255,.34),transparent 31%),linear-gradient(145deg,#0e1722,#08090d 68%)',
    prompt: 'حوّل الموضوع التالي إلى كاروسيل عربي من 7 شرائح مناسب لـInstagram وLinkedIn: [الموضوع]. الشريحة 1 Hook قصير جدًا، الشرائح 2-5 تشرح الفكرة تدريجيًا بمعلومة واحدة واضحة لكل شريحة، الشريحة 6 مثال أو خطأ شائع، الشريحة 7 خلاصة وCTA. أعطني لكل شريحة: العنوان، النص المختصر، واقتراح visual بسيط للمصمم. لا تستخدم حشوًا أو عبارات عامة.',
    time: '2 دقائق', result: 'سكريبت كاروسيل',
  },
  {
    id: 'service-reel',
    title: 'ريلز لخدمة خلال 15 ثانية',
    subtitle: 'Hook → مشكلة → حل → إثبات → CTA.',
    description: 'Storyboard رأسي جاهز لخدمة تجارية مع حركة الكاميرا والنصوص المقترحة لكل لقطة.',
    groups: ['reels', 'marketing'],
    tags: ['ريلز', 'خدمة', 'video', 'storyboard'],
    tool: 'video', status: 'draft', featured: false, industry: 'الخدمات',
    icon: Film, accent: '#ff3344', preview: 'radial-gradient(circle at 72% 34%,rgba(255,51,68,.4),transparent 31%),linear-gradient(160deg,#211014,#08090d 70%)',
    prompt: 'ريلز رأسي 9:16 لمدة 15 ثانية لخدمة [اسم الخدمة]. البداية Hook بصري خلال أول ثانيتين يوضح المشكلة، ثم لقطة سريعة للحل، لقطة توضح النتيجة أو الفائدة، ثم نهاية نظيفة للهوية وCTA. استخدم انتقالات سريعة لكن راقية، حركة كاميرا ديناميكية، إضاءة تجارية حديثة، واترك مناطق آمنة للنص العربي. صف كل لقطة وتوقيتها والحركة المطلوبة.',
    settings: { ratio: '9:16', duration: '15 ثانية', quality: '1080p' }, time: 'جهّز الآن', result: 'Storyboard ريلز',
  },
  {
    id: 'product-reel',
    title: 'ريلز كشف منتج Product Reveal',
    subtitle: 'لقطات قصيرة تجعل المنتج يبدو Premium.',
    description: 'كشف تدريجي، macro details، حركة كاميرا وإضاءة مناسبة لإعلان TikTok/Reels.',
    groups: ['reels', 'products', 'marketing'],
    tags: ['product reveal', 'ريلز', 'منتج', 'tiktok'],
    tool: 'video', status: 'draft', featured: false, industry: 'المنتجات',
    icon: Play, accent: '#ff7145', preview: 'radial-gradient(circle at 48% 52%,rgba(255,113,69,.38),transparent 34%),linear-gradient(145deg,#21120d,#08090d 70%)',
    prompt: 'فيديو Product Reveal رأسي 9:16 لمدة 10 ثوانٍ لمنتج [اسم المنتج]. ابدأ بظل أو silhouette غامض، ثم كشف تدريجي مع ضوء sweeping، لقطة macro للخامة أو التفصيل الأقوى، دوران أو push-in ناعم حول المنتج، ثم hero shot نهائية مع مساحة للشعار والـCTA. أسلوب إعلاني premium، حركة فيزيائية واقعية، بدون نصوص مولدة داخل الفيديو.',
    settings: { ratio: '9:16', duration: '10 ثوانٍ', quality: '1080p' }, time: 'جهّز الآن', result: 'وصف فيديو جاهز',
  },
  {
    id: 'restaurant-reel',
    title: 'ريلز مطعم سريع وشهي',
    subtitle: 'من المكونات إلى الطبق في 10 ثوانٍ.',
    description: 'تسلسل مشاهد للأكل والتحضير والـhero shot مناسب للمطاعم والمقاهي.',
    groups: ['reels', 'marketing'],
    tags: ['مطعم', 'ريلز', 'food', 'restaurant'],
    tool: 'video', status: 'draft', featured: false, industry: 'المطاعم والمقاهي',
    icon: Utensils, accent: '#ff8b3d', preview: 'radial-gradient(circle at 34% 40%,rgba(255,139,61,.4),transparent 34%),linear-gradient(145deg,#24170f,#08090d 68%)',
    prompt: 'ريلز طعام رأسي 9:16 لمدة 10 ثوانٍ لمطعم [اسم المطعم] يبرز [الطبق]. تسلسل سريع: مكوّن أساسي macro، لحظة التحضير الأكثر جاذبية، صب أو بخار أو حركة شهية، plating سريع، ثم hero shot للطبق. إضاءة دافئة سينمائية، حركة slow-motion قصيرة في اللحظة الأقوى، نهاية مناسبة للشعار وCTA.',
    settings: { ratio: '9:16', duration: '10 ثوانٍ', quality: '1080p' }, time: 'جهّز الآن', result: 'Storyboard مطعم',
  },
  {
    id: 'article-voiceover',
    title: 'حوّل مقالًا إلى تعليق صوتي',
    subtitle: 'نص طويل بصوت منصة واضح ووثائقي.',
    description: 'الصق المقال أو الملخص، واضبط نبرة عربية وثائقية وسرعة مريحة قبل تفعيل التوليد الصوتي.',
    groups: ['audio', 'writing'],
    tags: ['مقال', 'voiceover', 'تعليق صوتي', 'قراءة'],
    tool: 'audio', status: 'draft', featured: false, industry: 'المحتوى',
    icon: Mic2, accent: '#55d6be', preview: 'radial-gradient(circle at 68% 30%,rgba(85,214,190,.32),transparent 31%),linear-gradient(145deg,#0d201d,#08090d 68%)',
    prompt: 'اقرأ النص التالي كتعليق صوتي عربي واضح ومريح للمستمع: [الصق المقال أو النص هنا]. النبرة وثائقية طبيعية وغير مسرحية، مخارج الحروف واضحة، توقفات قصيرة عند علامات الترقيم، وتأكيد خفيف على العناوين والأفكار الأساسية. لا تغيّر معنى النص ولا تضف معلومات غير موجودة.',
    settings: { voice: 'وثائقي', language: 'العربية', speed: '1.0x' }, time: 'جهّز الآن', result: 'مسودة Voiceover',
  },
  {
    id: 'promo-voiceover',
    title: 'فويس أوفر إعلان 20 ثانية',
    subtitle: 'إلقاء تجاري واضح لخدمة أو عرض.',
    description: 'نبرة إعلانية من أصوات المنصة مع سرعة مناسبة للريلز والإعلانات القصيرة.',
    groups: ['audio', 'marketing'],
    tags: ['voiceover', 'إعلان', 'صوت', 'commercial'],
    tool: 'audio', status: 'draft', featured: false, industry: 'التسويق',
    icon: Megaphone, accent: '#5ad0ff', preview: 'radial-gradient(circle at 28% 30%,rgba(90,208,255,.32),transparent 30%),linear-gradient(145deg,#0d1b22,#08090d 68%)',
    prompt: 'أدِّ النص الإعلاني التالي كفويس أوفر عربي قصير وواثق: [اكتب النص]. اجعل البداية نشطة وجاذبة، وسط الجملة واضحًا ومقنعًا، والنهاية أكثر حسمًا عند الـCTA. إيقاع مناسب لإعلان 15–20 ثانية، بدون مبالغة صوتية أو سرعة تربك المستمع.',
    settings: { voice: 'إعلاني', language: 'العربية', speed: '1.1x' }, time: 'جهّز الآن', result: 'مسودة إعلان صوتي',
  },
  {
    id: 'cinematic-restyle',
    title: 'حوّل صورتك إلى لقطة سينمائية',
    subtitle: 'حافظ على الشخص/المنتج وغيّر الإضاءة والمزاج.',
    description: 'سيستخدم صورة مرجعية فعلية بدل إعادة تخمين محتواها. نعرضه الآن بوضوح كقدرة تنتظر رفع الصورة داخل الاستوديو.',
    groups: ['images'],
    tags: ['سينمائي', 'restyle', 'صورة مرجعية', 'cinematic'],
    tool: 'images', status: 'reference', featured: false, industry: 'عام',
    icon: Wand2, accent: '#9f7aea', image: 'https://images.unsplash.com/photo-1770062422698-651fc3e92d94?auto=format&fit=crop&w=1400&q=85', preview: 'radial-gradient(circle at 72% 24%,rgba(159,122,234,.38),transparent 31%),linear-gradient(145deg,#171226,#08090d 68%)',
    prompt: 'حافظ على هوية ومحتوى الصورة المرجعية، وحوّل المعالجة البصرية إلى لقطة سينمائية احترافية: إضاءة درامية واقعية، contrast محسوب، عمق ميدان طبيعي، color grading سينمائي، وتفاصيل عالية بدون تغيير ملامح الشخص أو شكل المنتج الأساسي.',
    style: 'cinematic', aspect: '16:9', time: 'يتطلب رفع صورة', result: 'Image-to-Image',
  },
  {
    id: 'cartoon-restyle',
    title: 'حوّل صورتك إلى رسم كرتوني',
    subtitle: 'نسخة Illustration تحافظ على السمات الأساسية.',
    description: 'قالب Image-to-Image حقيقي مخطط له، وليس مجرد prompt نصي؛ سيُفعل عند إضافة رفع الصورة المرجعية.',
    groups: ['images'],
    tags: ['كرتوني', 'cartoon', 'illustration', 'صورة مرجعية'],
    tool: 'images', status: 'reference', featured: false, industry: 'عام',
    icon: Palette, accent: '#f59ad1', preview: 'radial-gradient(circle at 25% 32%,rgba(245,154,209,.35),transparent 30%),linear-gradient(145deg,#22131e,#08090d 68%)',
    prompt: 'حوّل الصورة المرجعية إلى رسم كرتوني عالي الجودة مع الحفاظ على ملامح الشخص أو شكل العنصر الأساسي ونسبه. خطوط نظيفة، ألوان متوازنة، إضاءة ناعمة، خلفية مبسطة، تفاصيل كافية للتعرّف على الأصل بدون تشويه أو تغيير الهوية.',
    style: 'none', aspect: '1:1', time: 'يتطلب رفع صورة', result: 'Image-to-Image',
  },
];

function getQuickFields(template) {
  return QUICK_FIELDS[template.id] || [];
}

function applyQuickValues(prompt, fields, values) {
  return fields.reduce((prepared, field) => {
    const value = String(values[field.token] || '').trim();
    return value ? prepared.split(field.token).join(value) : prepared;
  }, prompt);
}

function templateSearchText(template) {
  return [template.title, template.subtitle, template.description, template.industry, TOOL_META[template.tool]?.label, ...(template.tags || [])]
    .join(' ')
    .toLowerCase();
}

function statusCopy(status) {
  return STATUS_META[status] || STATUS_META.active;
}

function ToolPreviewArtwork({ template }) {
  if (template.image) return null;

  if (template.tool === 'video') {
    return (
      <div className="absolute inset-0 flex items-center justify-center p-5">
        <div className="relative h-[88%] w-[38%] min-w-[86px] max-w-[120px] overflow-hidden rounded-[18px] border border-white/20 bg-black/50 shadow-2xl">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_25%,rgba(255,255,255,.16),transparent_28%),linear-gradient(180deg,rgba(255,51,68,.32),rgba(7,8,11,.94))]" />
          <div className="absolute left-2 top-2 rounded-full bg-black/45 px-2 py-1 text-[8px] font-black text-white/70">9:16</div>
          <div className="absolute inset-0 flex items-center justify-center"><span className="flex h-10 w-10 items-center justify-center rounded-full border border-white/25 bg-black/45 text-white"><Play size={17} fill="currentColor" /></span></div>
          <div className="absolute bottom-3 left-2 right-2 space-y-1.5">
            <div className="h-1.5 w-3/4 rounded-full bg-white/75" />
            <div className="h-1 w-1/2 rounded-full bg-white/30" />
          </div>
        </div>
        <div className="absolute bottom-5 left-5 right-5 flex items-center gap-1.5 rounded-full border border-white/10 bg-black/35 p-1.5 backdrop-blur">
          {[32, 58, 42, 76, 50].map((width, index) => <span key={width} className="h-1.5 rounded-full" style={{ width: `${width}%`, backgroundColor: index === 3 ? template.accent : 'rgba(255,255,255,.25)' }} />)}
        </div>
      </div>
    );
  }

  if (template.tool === 'audio') {
    const bars = [22, 38, 56, 34, 72, 48, 84, 60, 42, 68, 36, 54, 30, 46, 26];
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center px-7">
        <span className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/15 bg-black/35 backdrop-blur" style={{ color: template.accent }}><Mic2 size={27} /></span>
        <div className="flex h-16 w-full items-center justify-center gap-1.5">
          {bars.map((height, index) => <span key={`${height}-${index}`} className="w-1.5 rounded-full" style={{ height: `${height}%`, backgroundColor: index % 4 === 0 ? template.accent : 'rgba(255,255,255,.26)' }} />)}
        </div>
        <div className="mt-3 rounded-full border border-white/10 bg-black/30 px-3 py-1 text-[9px] font-black text-white/60">VOICE · AR · 1.0x</div>
      </div>
    );
  }

  if (template.tool === 'chat') {
    return (
      <div className="absolute inset-0 flex items-center justify-center p-6">
        <div className="w-[82%] max-w-[300px] space-y-2.5 rounded-2xl border border-white/12 bg-black/35 p-4 shadow-2xl backdrop-blur-sm">
          <div className="flex items-center justify-between"><span className="rounded-full px-2 py-1 text-[8px] font-black" style={{ color: template.accent, backgroundColor: `${template.accent}20` }}>HOOK</span><MessageSquare size={13} className="text-white/35" /></div>
          <div className="h-2.5 w-4/5 rounded-full bg-white/75" />
          <div className="h-1.5 w-full rounded-full bg-white/20" />
          <div className="h-1.5 w-5/6 rounded-full bg-white/20" />
          <div className="grid grid-cols-3 gap-1.5 pt-1">
            <span className="h-8 rounded-lg border border-white/8 bg-white/[.05]" />
            <span className="h-8 rounded-lg border border-white/8 bg-white/[.05]" />
            <span className="h-8 rounded-lg border border-white/8" style={{ backgroundColor: `${template.accent}22` }} />
          </div>
        </div>
      </div>
    );
  }

  if (template.status === 'reference') {
    return (
      <div className="absolute inset-0 flex items-center justify-center gap-3 p-7">
        <div className="flex aspect-square w-[34%] items-center justify-center rounded-2xl border border-white/12 bg-white/[.05] text-white/30"><ImageIcon size={30} /></div>
        <ArrowLeft size={20} style={{ color: template.accent }} />
        <div className="flex aspect-square w-[34%] items-center justify-center rounded-2xl border border-white/15 shadow-xl" style={{ color: template.accent, background: `radial-gradient(circle at 35% 25%,${template.accent}55,transparent 34%),#151019` }}><Palette size={32} /></div>
      </div>
    );
  }

  return null;
}

function Preview({ template, large = false, compact = false }) {
  const Icon = template.icon || Sparkles;
  const sizeClass = compact ? 'h-full min-h-[112px]' : large ? 'min-h-[220px] sm:min-h-[260px]' : 'h-40 sm:h-44';
  return (
    <div className={`bb-media-canvas relative overflow-hidden ${sizeClass}`} style={{ backgroundImage: template.image ? undefined : template.preview }}>
      {template.image && <img src={template.image} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]" />}
      <ToolPreviewArtwork template={template} />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,4,6,.04),rgba(3,4,6,.16)_42%,rgba(3,4,6,.9))]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_88%_8%,rgba(243,19,37,.18),transparent_30%)]" />
      <div className={`${compact ? 'right-2.5 top-2.5 h-8 w-8 rounded-lg' : 'right-4 top-4 h-10 w-10 rounded-xl sm:right-5 sm:top-5 sm:h-12 sm:w-12 sm:rounded-2xl'} absolute flex items-center justify-center border border-white/15 bg-black/45 backdrop-blur`} style={{ color: template.accent }}><Icon size={compact ? 16 : large ? 24 : 20} /></div>
      {!compact && <div className="absolute bottom-4 left-4 right-4 sm:bottom-5 sm:left-5 sm:right-5"><div className="mb-1.5 flex items-center gap-2 text-[9px] font-black text-white/65 sm:text-[10px]"><Zap size={12} style={{ color: template.accent }} /> {template.result}</div><div className={`${large ? 'text-xl sm:text-2xl' : 'text-base sm:text-lg'} font-black text-white drop-shadow-lg`}>{template.title}</div></div>}
    </div>
  );
}

function MobileTemplateCard({ template, onOpen }) {
  const status = statusCopy(template.status);
  const ToolIcon = TOOL_META[template.tool].icon;
  return (
    <button type="button" onClick={() => onOpen(template)} className="bb-card group grid w-full grid-cols-[108px_1fr] overflow-hidden rounded-2xl border text-right transition active:scale-[.99]">
      <div className="min-h-[118px] overflow-hidden"><Preview template={template} compact /></div>
      <div className="flex min-w-0 flex-col justify-center p-3.5">
        <div className="flex flex-wrap items-center gap-1.5"><span className={`rounded-full border px-2 py-0.5 text-[8px] font-black ${status.className}`}>{status.label}</span><span className="bb-text-tertiary flex items-center gap-1 text-[8px] font-black"><ToolIcon size={10} /> {TOOL_META[template.tool].label}</span></div>
        <h3 className="bb-text-primary mt-2 line-clamp-2 text-sm font-black leading-5">{template.title}</h3>
        <p className="mt-1 line-clamp-1 text-[10px] font-bold" style={{ color: template.accent }}>{template.subtitle}</p>
        <div className="bb-text-tertiary mt-2 flex items-center gap-1 text-[9px]"><Clock3 size={10} /> {template.time}</div>
      </div>
    </button>
  );
}

export default function TemplatesLivingLibrary() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [creatingId, setCreatingId] = useState(null);
  const [toast, setToast] = useState(null);
  const [previewTemplate, setPreviewTemplate] = useState(null);
  const [quickValues, setQuickValues] = useState({});
  const [showAllMobile, setShowAllMobile] = useState(false);

  useEffect(() => {
    if (!previewTemplate) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setPreviewTemplate(null);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [previewTemplate]);

  const showToast = (text) => {
    setToast(text);
    window.setTimeout(() => setToast(null), 4500);
  };

  const handleUseTemplate = async (template, promptOverride = '') => {
    if (template.status === 'reference') {
      showToast('هذا القالب يحتاج رفع صورة مرجعية حقيقي. سيُفعّل مع مسار تحرير الصور بدل إظهار قدرة وهمية الآن.');
      return;
    }
    if (loading) return;
    if (!user) {
      router.push('/auth?next=%2Ftemplates');
      return;
    }

    const tool = TOOL_META[template.tool];
    if (!tool) return;
    setCreatingId(template.id);

    try {
      const project = await createUserProject({
        name: template.title,
        industry: template.industry,
        description: `قالب تجربة: ${template.title} — ${template.description}`,
        type: tool.projectType,
        language: 'العربية',
        tone: 'احترافي',
      });

      const params = new URLSearchParams({ project: project.id, prompt: promptOverride || template.prompt });
      if (template.style) params.set('style', template.style);
      if (template.aspect) params.set('aspect', template.aspect);
      Object.entries(template.settings || {}).forEach(([key, value]) => params.set(key, String(value)));
      router.push(`${tool.path}?${params.toString()}`);
    } catch (err) {
      showToast(err?.message || 'تعذر إنشاء المشروع من القالب');
      setCreatingId(null);
    }
  };

  const normalizedSearch = search.trim().toLowerCase();
  const filtered = useMemo(() => TEMPLATES.filter((template) => {
    const categoryMatches = activeCategory === 'all' || template.groups.includes(activeCategory);
    const searchMatches = !normalizedSearch || templateSearchText(template).includes(normalizedSearch);
    return categoryMatches && searchMatches;
  }), [activeCategory, normalizedSearch]);

  const featured = TEMPLATES.filter((template) => template.featured);
  const activeNow = TEMPLATES.filter((template) => template.status === 'active').length;
  const prepNow = TEMPLATES.filter((template) => template.status === 'draft').length;
  const shouldLimitMobile = activeCategory === 'all' && !normalizedSearch && !showAllMobile;
  const mobileTemplates = shouldLimitMobile ? filtered.slice(0, MOBILE_INITIAL_LIMIT) : filtered;

  const selectCategory = (categoryId) => {
    setActiveCategory(categoryId);
    setShowAllMobile(false);
  };

  return (
    <main dir="rtl" className="bb-app-canvas min-h-[calc(100vh-5rem)]">
      {toast && <div role="status" className="bb-panel bb-text-secondary fixed left-4 right-4 top-24 z-[250] mx-auto max-w-xl rounded-2xl border px-5 py-4 text-sm leading-6 shadow-[var(--bb-shadow-lg)] backdrop-blur sm:left-6 sm:right-auto">{toast}</div>}

      {previewTemplate && (() => {
        const template = previewTemplate;
        const status = statusCopy(template.status);
        const ToolIcon = TOOL_META[template.tool].icon;
        const quickFields = getQuickFields(template);
        const values = quickValues[template.id] || {};
        const preparedPrompt = applyQuickValues(template.prompt, quickFields, values);
        const missingRequiredFields = quickFields.filter((field) => field.required && !String(values[field.token] || '').trim());
        const quickReady = missingRequiredFields.length === 0;
        const updateQuickField = (field, value) => {
          const safeValue = value.slice(0, field.maxLength || 500);
          setQuickValues((current) => ({
            ...current,
            [template.id]: { ...(current[template.id] || {}), [field.token]: safeValue },
          }));
        };
        return (
          <div className="fixed inset-0 z-[240] flex items-end justify-center bg-black/75 p-0 backdrop-blur-sm sm:items-center sm:p-5" role="presentation" onClick={() => setPreviewTemplate(null)}>
            <div role="dialog" aria-modal="true" aria-labelledby="template-preview-title" className="bb-panel max-h-[92vh] w-full overflow-y-auto rounded-t-[28px] border shadow-[var(--bb-shadow-lg)] sm:max-w-3xl sm:rounded-[30px]" onClick={(event) => event.stopPropagation()}>
              <Preview template={template} large />
              <div className="p-5 sm:p-7">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black ${status.className}`}>{status.label}</span>
                  <span className="bb-button-secondary bb-text-secondary flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-black"><ToolIcon size={12} /> {TOOL_META[template.tool].label}</span>
                  <span className="bb-button-secondary bb-text-tertiary rounded-full border px-2.5 py-1 text-[10px] font-black">{template.time}</span>
                </div>
                <h2 id="template-preview-title" className="bb-text-primary mt-4 text-xl font-black sm:text-2xl">{template.title}</h2>
                <p className="mt-2 text-sm font-bold" style={{ color: template.accent }}>{template.subtitle}</p>
                <p className="bb-text-secondary mt-4 text-sm leading-7">{template.description}</p>

                {quickFields.length > 0 && template.status !== 'reference' && (
                  <div className="bb-accent-soft mt-5 rounded-2xl border p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div><div className="bb-text-primary text-xs font-black">خصّص القالب في ثوانٍ</div><p className="bb-text-tertiary mt-1 text-[10px] leading-5">املأ الحقول وسنجهّز البرومبت النهائي تلقائيًا قبل فتح الأداة.</p></div>
                      <Sparkles size={17} className="bb-text-accent mt-0.5 shrink-0" />
                    </div>
                    <div className={`mt-4 grid gap-3 ${quickFields.length > 1 ? 'sm:grid-cols-2' : ''}`}>
                      {quickFields.map((field) => (
                        <label key={field.token} className={field.multiline ? 'sm:col-span-2' : ''}>
                          <span className="bb-text-secondary mb-1.5 block text-[10px] font-black">{field.label}{field.required ? <span className="bb-text-accent mr-1">*</span> : null}</span>
                          {field.multiline ? (
                            <textarea rows={4} value={values[field.token] || ''} onChange={(event) => updateQuickField(field, event.target.value)} placeholder={field.placeholder} className="bb-input w-full resize-none rounded-xl border px-3.5 py-3 text-xs leading-6 outline-none" />
                          ) : (
                            <input value={values[field.token] || ''} onChange={(event) => updateQuickField(field, event.target.value)} placeholder={field.placeholder} className="bb-input w-full rounded-xl border px-3.5 py-3 text-xs outline-none" />
                          )}
                        </label>
                      ))}
                    </div>
                    {!quickReady && <p className="mt-3 text-[10px] font-bold text-[var(--bb-warning)]">أكمل {missingRequiredFields.length} {missingRequiredFields.length === 1 ? 'حقل مطلوب' : 'حقول مطلوبة'} للمتابعة.</p>}
                  </div>
                )}

                <div className="bb-surface-1 bb-border mt-5 rounded-2xl border p-4">
                  <div className="flex items-center justify-between gap-3"><div className="bb-text-accent text-[10px] font-black">البرومبت الجاهز</div>{quickFields.length > 0 && <span className="bb-text-tertiary text-[9px] font-bold">يتحدّث تلقائيًا</span>}</div>
                  <p className="bb-text-secondary mt-2 line-clamp-5 text-xs leading-6">{preparedPrompt}</p>
                </div>

                <div className="bb-surface-2 bb-divider sticky bottom-0 z-10 -mx-5 -mb-5 mt-5 flex gap-2 border-t px-5 py-4 backdrop-blur-xl sm:static sm:mx-0 sm:mb-0 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0 sm:backdrop-blur-none">
                  <button type="button" onClick={() => setPreviewTemplate(null)} className="bb-button-secondary flex-1 rounded-xl border py-3 text-xs font-black">رجوع</button>
                  <button type="button" onClick={() => { setPreviewTemplate(null); void handleUseTemplate(template, preparedPrompt); }} disabled={creatingId !== null || loading || !quickReady} className={`flex-[1.6] rounded-xl py-3 text-xs font-black disabled:cursor-not-allowed disabled:opacity-50 ${template.status === 'reference' ? 'bb-button-secondary bb-text-disabled border' : 'bb-button-primary'}`}>{!quickReady ? 'أكمل الحقول أولاً' : status.button}</button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      <div className="mx-auto max-w-[1500px] space-y-7 px-4 py-5 sm:space-y-8 sm:px-6 sm:py-8 lg:px-8">
        <div className="bb-text-tertiary flex items-center gap-2 text-xs"><span>الرئيسية</span><ArrowLeft size={13} className="rotate-180" /><span className="bb-text-secondary">مكتبة القوالب</span></div>

        <section className="bb-dashboard-hero relative overflow-hidden rounded-[26px] border px-5 py-6 sm:rounded-[32px] sm:px-8 sm:py-9 lg:px-10">
          <div className="relative grid gap-6 sm:gap-8 lg:grid-cols-[1fr_420px] lg:items-center">
            <div>
              <div className="bb-accent-soft inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] font-black sm:text-[11px]"><Flame size={14} /> الأكثر استخدامًا في صناعة المحتوى الآن</div>
              <h1 className="bb-text-primary mt-4 max-w-3xl text-[29px] font-black leading-[1.28] sm:mt-5 sm:text-4xl lg:text-5xl">لا تبدأ من صفحة فارغة.<br /><span className="bb-text-accent">اختر النتيجة التي تريدها.</span></h1>
              <p className="bb-text-secondary mt-3 max-w-2xl text-[13px] leading-6 sm:mt-4 sm:text-base sm:leading-7">قوالب Brand Box أصبحت تجارب جاهزة: إعلان منتج، ريلز، معايدة، كاروسيل، كتابة حملة أو تعليق صوتي. افتح القالب وسيذهب البرومبت والإعداد المناسب مباشرة إلى الأداة الصحيحة.</p>
              <div className="mt-5 flex flex-wrap gap-2 text-[10px] sm:mt-6 sm:gap-3 sm:text-xs">
                <span className="bb-card flex items-center gap-2 rounded-xl border px-3 py-2"><BadgeCheck size={14} className="text-[var(--bb-success)]" /><strong>{activeNow}</strong> فعّالة الآن</span>
                <span className="bb-card flex items-center gap-2 rounded-xl border px-3 py-2"><Clock3 size={14} className="text-[var(--bb-warning)]" /><strong>{prepNow}</strong> جهّزها الآن</span>
                <span className="bb-card flex items-center gap-2 rounded-xl border px-3 py-2"><Layers3 size={14} className="bb-text-accent" /><strong>{TEMPLATES.length}</strong> تجربة</span>
              </div>
            </div>
            <div className="bb-card rounded-[22px] border p-2.5 sm:rounded-[26px] sm:p-3"><Preview template={TEMPLATES[0]} large /><div className="hidden grid-cols-2 gap-2 pt-2 sm:grid">{featured.slice(1, 3).map((template) => <div key={template.id} className="bb-border overflow-hidden rounded-xl border"><Preview template={template} /></div>)}</div></div>
          </div>
        </section>

        <section className="bb-surface-elevated sticky top-20 z-30 rounded-2xl border border-[var(--bb-border)] p-2.5 backdrop-blur-xl sm:p-3">
          <div className="flex flex-col gap-2.5 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex gap-2 overflow-x-auto pb-1 xl:pb-0">{CATEGORIES.map((category) => { const Icon = category.icon; const active = category.id === activeCategory; return <button key={category.id} type="button" onClick={() => selectCategory(category.id)} className={`flex shrink-0 items-center gap-1.5 rounded-xl border px-3 py-2 text-[11px] font-black transition sm:gap-2 sm:px-3.5 sm:py-2.5 sm:text-xs ${active ? 'bb-button-primary border-[var(--bb-accent)]' : 'bb-button-secondary'}`}><Icon size={14} /> {category.label}</button>; })}</div>
            <label className="bb-input flex min-w-0 items-center gap-2 rounded-xl border px-4 py-2.5 focus-within:border-[var(--bb-accent)] xl:w-[330px]"><Search size={16} className="bb-text-tertiary" /><input value={search} onChange={(event) => { setSearch(event.target.value); setShowAllMobile(false); }} placeholder="ابحث: منتج، ريلز، مقال..." className="bb-text-primary w-full bg-transparent text-xs outline-none placeholder:text-[var(--bb-placeholder)]" /></label>
          </div>
        </section>

        {activeCategory === 'all' && !normalizedSearch && (
          <section>
            <div className="mb-4 flex items-end justify-between gap-4"><div><div className="bb-text-accent flex items-center gap-2 text-sm font-black"><Flame size={17} /> ابدأ بهذه</div><h2 className="bb-text-primary mt-1 text-xl font-black sm:text-2xl">تجارب رائجة وسهلة التجربة</h2></div><span className="bb-text-tertiary hidden text-xs sm:block">نتيجة واضحة بدل اختيار “نوع تصميم” عام</span></div>
            <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0 lg:grid lg:grid-cols-3 lg:overflow-visible lg:pb-0">
              {featured.map((template) => { const status = statusCopy(template.status); const ToolIcon = TOOL_META[template.tool].icon; return <article key={template.id} className="bb-card group w-[82vw] max-w-[360px] shrink-0 snap-start overflow-hidden rounded-[24px] border transition duration-300 hover:-translate-y-1 sm:w-[360px] lg:w-auto lg:max-w-none lg:rounded-[26px]"><Preview template={template} large /><div className="p-5"><div className="flex flex-wrap items-center gap-2"><span className={`rounded-full border px-2.5 py-1 text-[10px] font-black ${status.className}`}>{status.label}</span><span className="bb-button-secondary bb-text-tertiary flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-black"><ToolIcon size={12} /> {TOOL_META[template.tool].label}</span></div><p className="bb-text-secondary mt-4 line-clamp-3 text-sm leading-7">{template.description}</p><button type="button" onClick={() => setPreviewTemplate(template)} disabled={creatingId !== null || loading} className="bb-button-primary mt-5 flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-black disabled:opacity-50"><Sparkles size={17} /> {creatingId === template.id ? 'جاري تجهيز التجربة...' : user ? status.button : 'سجّل الدخول للتجربة'}</button></div></article>; })}
            </div>
          </section>
        )}

        <section>
          <div className="mb-4 flex items-end justify-between gap-3"><div><div className="bb-text-tertiary text-[10px] font-black sm:text-xs">EXPLORE</div><h2 className="bb-text-primary mt-1 text-xl font-black sm:text-2xl">كل التجارب</h2></div><span className="bb-text-tertiary text-[10px] sm:text-xs">{filtered.length} قالب مطابق</span></div>
          {filtered.length === 0 ? <div className="bb-panel bb-text-secondary rounded-3xl border border-dashed p-10 text-center"><Search className="bb-text-disabled mx-auto h-8 w-8" /><div className="bb-text-primary mt-4 font-black">لا توجد تجربة مطابقة</div><p className="bb-text-tertiary mt-2 text-sm">جرّب كلمة مثل: منتج، ريلز، مقال، معايدة أو عقار.</p></div> : <>
            <div className="space-y-3 md:hidden">{mobileTemplates.map((template) => <MobileTemplateCard key={template.id} template={template} onOpen={setPreviewTemplate} />)}</div>
            {activeCategory === 'all' && !normalizedSearch && filtered.length > MOBILE_INITIAL_LIMIT && <button type="button" onClick={() => setShowAllMobile((value) => !value)} className="bb-button-secondary mt-4 flex w-full items-center justify-center gap-2 rounded-xl border py-3 text-xs font-black md:hidden">{showAllMobile ? <ChevronUp size={15} /> : <ChevronDown size={15} />}{showAllMobile ? 'عرض أقل' : `عرض جميع القوالب (${filtered.length})`}</button>}
            <div className="hidden gap-5 md:grid md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">{filtered.map((template) => { const status = statusCopy(template.status); const ToolIcon = TOOL_META[template.tool].icon; const disabledByCapability = template.status === 'reference'; return <article key={template.id} className="bb-card group flex flex-col overflow-hidden rounded-[24px] border transition duration-300 hover:-translate-y-1"><Preview template={template} /><div className="flex flex-1 flex-col p-5"><div className="flex flex-wrap items-center gap-2"><span className={`rounded-full border px-2.5 py-1 text-[10px] font-black ${status.className}`}>{status.label}</span><span className="bb-text-tertiary flex items-center gap-1.5 text-[10px] font-black"><ToolIcon size={12} /> {TOOL_META[template.tool].label}</span></div><h3 className="bb-text-primary mt-4 text-base font-black">{template.title}</h3><p className="mt-1 text-xs font-bold" style={{ color: template.accent }}>{template.subtitle}</p><p className="bb-text-secondary mt-3 line-clamp-3 flex-1 text-xs leading-6">{template.description}</p><div className="bb-divider bb-text-tertiary mt-4 flex items-center justify-between border-t pt-4 text-[10px]"><span className="flex items-center gap-1.5"><Clock3 size={12} /> {template.time}</span><span>{template.result}</span></div><button type="button" onClick={() => setPreviewTemplate(template)} disabled={creatingId !== null || loading} className={`mt-4 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-xs font-black transition disabled:opacity-50 ${disabledByCapability ? 'bb-button-secondary bb-text-disabled border' : 'bb-button-secondary border hover:border-[var(--bb-accent)] hover:text-[var(--bb-accent)]'}`}>{disabledByCapability ? <Wand2 size={15} /> : <Sparkles size={15} />} {creatingId === template.id ? 'جاري تجهيز التجربة...' : user ? status.button : disabledByCapability ? status.button : 'سجّل الدخول للتجربة'}</button></div></article>; })}</div>
          </>}
        </section>

        <section className="bb-panel rounded-[24px] border border-[var(--bb-accent-border)] p-5 sm:rounded-[28px] sm:p-8"><div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center"><div><div className="bb-text-accent flex items-center gap-2 text-sm font-black"><Wand2 size={18} /> قوالب التحويل بالصورة المرجعية</div><h2 className="bb-text-primary mt-2 text-lg font-black sm:text-xl">سينمائي وكرتوني — بدون ادعاء قدرة غير جاهزة</h2><p className="bb-text-secondary mt-2 max-w-3xl text-xs leading-6 sm:text-sm sm:leading-7">هذه التجارب ظاهرة من الآن لأنها مطلوبة، لكن تشغيلها سيبقى مقفولًا حتى يدعم استوديو الصور رفع صورة مرجعية وإرسالها إلى نموذج تحرير صور فعلي.</p></div><div className="bb-accent-soft flex items-center gap-2 rounded-2xl border px-4 py-3 text-xs font-black"><Palette size={17} /> Image-to-Image ضمن مسار الصور</div></div></section>
      </div>
    </main>
  );
}
