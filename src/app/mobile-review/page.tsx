'use client';

import { useMemo, useState } from 'react';

type ScreenId = 'home' | 'create' | 'projects' | 'trends' | 'store' | 'campaign' | 'social';

const RED = '#F31325';
const BG = '#08090B';
const SURFACE = '#111318';
const RAISED = '#171A20';
const BORDER = '#272B33';
const TEXT = '#F7F8FA';
const MUTED = '#9299A6';

const nav: Array<{ id: ScreenId; label: string; icon: string }> = [
  { id: 'home', label: 'الرئيسية', icon: '⌂' },
  { id: 'create', label: 'إنشاء', icon: '✦' },
  { id: 'projects', label: 'مشاريعي', icon: '▣' },
  { id: 'trends', label: 'الترند', icon: '↗' },
  { id: 'store', label: 'المتجر', icon: '◇' },
];

const socialRows = [
  { name: 'Facebook & Instagram', state: 'جاهز للربط', tone: '#67A7FF', icon: 'f' },
  { name: 'TikTok', state: 'بانتظار إعداد المطور', tone: '#FFBF4B', icon: '♪' },
  { name: 'YouTube', state: 'جاهز للربط', tone: '#67A7FF', icon: '▶' },
  { name: 'LinkedIn', state: 'جاهز للربط', tone: '#67A7FF', icon: 'in' },
];

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 18, padding: 16, ...style }}>{children}</div>;
}

function Pill({ children, tone = MUTED }: { children: React.ReactNode; tone?: string }) {
  return <span style={{ color: tone, background: `${tone}18`, border: `1px solid ${tone}33`, padding: '5px 9px', borderRadius: 999, fontSize: 10, fontWeight: 900 }}>{children}</span>;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 15, fontWeight: 900, color: TEXT, marginTop: 6 }}>{children}</div>;
}

function Button({ children, secondary = false, onClick }: { children: React.ReactNode; secondary?: boolean; onClick?: () => void }) {
  return (
    <button onClick={onClick} style={{ width: '100%', border: secondary ? `1px solid ${BORDER}` : 0, background: secondary ? RAISED : RED, color: TEXT, borderRadius: 14, padding: '12px 14px', fontWeight: 900, cursor: 'pointer', fontFamily: 'inherit' }}>
      {children}
    </button>
  );
}

function Home({ go }: { go: (id: ScreenId) => void }) {
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: RED, fontSize: 11, fontWeight: 950, letterSpacing: 1.1 }}><span style={{ width: 8, height: 8, background: RED, borderRadius: 8 }} /> BRAND BOX AI</div>
        <h1 style={{ fontSize: 26, lineHeight: 1.2, margin: '10px 0 6px', color: TEXT }}>مركز النمو الذكي</h1>
        <p style={{ margin: 0, color: MUTED, lineHeight: 1.65, fontSize: 13 }}>من الترند إلى فكرة، ومن الفكرة إلى محتوى ومشروع قابل للنشر.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Card><div style={{ fontSize: 28, fontWeight: 950, color: TEXT }}>1,240</div><div style={{ color: MUTED, fontSize: 11 }}>نقطة AI</div></Card>
        <Card><div style={{ fontSize: 28, fontWeight: 950, color: TEXT }}>8</div><div style={{ color: MUTED, fontSize: 11 }}>مشاريع نشطة</div></Card>
      </div>

      <Card style={{ background: `linear-gradient(135deg, ${SURFACE}, #1B0D10)` }}>
        <div style={{ color: RED, fontSize: 10, fontWeight: 950, letterSpacing: 1.2 }}>CREATE FIRST</div>
        <div style={{ color: TEXT, fontSize: 18, fontWeight: 950, marginTop: 7 }}>ابدأ من الهدف، وليس من الأداة.</div>
        <p style={{ color: MUTED, fontSize: 12, lineHeight: 1.6 }}>أنشئ نصًا أو صورة أو فيديو، أو حوّل فرصة ترند إلى حملة تسويقية متكاملة.</p>
        <Button onClick={() => go('create')}>فتح استوديو AI</Button>
      </Card>

      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
          <div><div style={{ color: TEXT, fontWeight: 950 }}>السوشيال ميديا</div><div style={{ color: MUTED, fontSize: 11, marginTop: 5 }}>OAuth مشفّر + جدولة آمنة</div></div>
          <div style={{ width: 42, height: 42, background: '#1D1114', border: `1px solid ${RED}33`, color: RED, borderRadius: 14, display: 'grid', placeItems: 'center', fontWeight: 950 }}>↗</div>
        </div>
        <div style={{ marginTop: 12 }}><Button secondary onClick={() => go('social')}>إدارة الحسابات المتصلة</Button></div>
      </Card>

      <SectionTitle>آخر المشاريع</SectionTitle>
      {['هوية NEXORA', 'حملة العودة للمدارس', 'منتجات Brand Box Store'].map((name, i) => (
        <Card key={name} style={{ padding: 13 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><div><div style={{ color: TEXT, fontWeight: 850, fontSize: 13 }}>{name}</div><div style={{ color: MUTED, fontSize: 10, marginTop: 4 }}>{['هوية بصرية', 'حملة تسويقية', 'متجر رقمي'][i]}</div></div><span style={{ color: RED }}>‹</span></div>
        </Card>
      ))}
    </div>
  );
}

function Create({ go }: { go: (id: ScreenId) => void }) {
  const tools = [
    ['صور AI', 'حوّل الوصف إلى تصميم بصري', '▧'],
    ['محادثة AI', 'كتابة، أفكار، تخطيط وحلول', '✦'],
    ['فيديو AI', 'حوّل الفكرة إلى فيديو قصير', '▶'],
    ['Campaign Composer', 'من الهدف إلى حملة كاملة', '◎'],
  ];
  return <div style={{ display: 'grid', gap: 12 }}><div><div style={{ color: RED, fontSize: 10, fontWeight: 950 }}>AI STUDIO</div><h1 style={{ color: TEXT, fontSize: 25, margin: '8px 0 5px' }}>ماذا تريد أن تنشئ؟</h1><p style={{ color: MUTED, fontSize: 12, lineHeight: 1.6, margin: 0 }}>اختر مسار العمل، وسيحفظ الناتج تلقائيًا داخل مشروعك.</p></div>{tools.map(([title, desc, icon]) => <button key={title} onClick={() => title === 'Campaign Composer' ? go('campaign') : undefined} style={{ textAlign: 'right', border: `1px solid ${BORDER}`, background: SURFACE, color: TEXT, borderRadius: 18, padding: 15, cursor: 'pointer', fontFamily: 'inherit' }}><div style={{ display: 'flex', gap: 12, alignItems: 'center' }}><div style={{ width: 44, height: 44, borderRadius: 14, background: '#1D1114', color: RED, display: 'grid', placeItems: 'center', fontSize: 20 }}>{icon}</div><div style={{ flex: 1 }}><div style={{ fontWeight: 950, fontSize: 15 }}>{title}</div><div style={{ color: MUTED, fontSize: 11, marginTop: 5 }}>{desc}</div></div><div style={{ color: MUTED }}>‹</div></div></button>)}</div>;
}

function Projects() {
  const rows = [
    ['حملة Brand Box Launch', 'تسويق', 'نشط', 'اليوم'],
    ['هوية NEXORA', 'Brand Kit', 'نشط', 'أمس'],
    ['مدارس 2026', 'Social Campaign', 'مراجعة', 'منذ يومين'],
    ['CCNA — نقلة', 'إعلانات', 'مكتمل', '28 أغسطس'],
  ];
  return <div style={{ display: 'grid', gap: 11 }}><div><div style={{ color: RED, fontSize: 10, fontWeight: 950 }}>PROJECTS</div><h1 style={{ color: TEXT, fontSize: 25, margin: '8px 0 5px' }}>مشاريعي</h1><p style={{ color: MUTED, fontSize: 12, margin: 0 }}>كل الهوية والمحتوى والأصول في مكان واحد.</p></div><Button>+ مشروع جديد</Button>{rows.map(([name, type, state, date]) => <Card key={name} style={{ padding: 14 }}><div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}><div><div style={{ color: TEXT, fontWeight: 900, fontSize: 14 }}>{name}</div><div style={{ color: MUTED, fontSize: 10, marginTop: 4 }}>{type} · {date}</div></div><Pill tone={state === 'مكتمل' ? '#66D19E' : state === 'مراجعة' ? '#FFBF4B' : '#67A7FF'}>{state}</Pill></div></Card>)}</div>;
}

function Trends({ go }: { go: (id: ScreenId) => void }) {
  const trends = [
    ['العودة إلى المدارس', 'ليبيا', '+82%', 'تعليم'],
    ['العروض الموسمية', 'الشرق الأوسط', '+61%', 'تجارة'],
    ['AI Product Visuals', 'عالمي', '+48%', 'تصميم'],
  ];
  return <div style={{ display: 'grid', gap: 12 }}><div><div style={{ color: RED, fontSize: 10, fontWeight: 950 }}>TREND RADAR</div><h1 style={{ color: TEXT, fontSize: 25, margin: '8px 0 5px' }}>فرص اليوم</h1><p style={{ color: MUTED, fontSize: 12, margin: 0, lineHeight: 1.6 }}>اكتشف ما يستحق أن تتحرك نحوه قبل أن يصبح مزدحمًا.</p></div>{trends.map(([name, area, rise, cat]) => <Card key={name}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 10 }}><div><div style={{ color: TEXT, fontWeight: 950, fontSize: 15 }}>{name}</div><div style={{ color: MUTED, fontSize: 10, marginTop: 5 }}>{area} · {cat}</div></div><Pill tone="#66D19E">{rise}</Pill></div><div style={{ marginTop: 12 }}><Button secondary onClick={() => go('campaign')}>حوّلها إلى حملة</Button></div></Card>)}</div>;
}

function Store() {
  const products = [['حزمة قوالب المدارس', '120 نقطة', '24 قالب'], ['Brand Kit Starter', '85 نقطة', '12 أصل'], ['Social Launch Pack', '160 نقطة', '30 تصميم']];
  return <div style={{ display: 'grid', gap: 12 }}><div><div style={{ color: RED, fontSize: 10, fontWeight: 950 }}>BRAND BOX STORE</div><h1 style={{ color: TEXT, fontSize: 25, margin: '8px 0 5px' }}>أصول جاهزة للنمو</h1><p style={{ color: MUTED, fontSize: 12, margin: 0 }}>قوالب وحزم رقمية وخدمات إنتاج وطباعة.</p></div>{products.map(([name, price, count], i) => <Card key={name}><div style={{ height: 96, borderRadius: 14, marginBottom: 12, background: i === 0 ? 'linear-gradient(135deg,#241014,#57151E)' : i === 1 ? 'linear-gradient(135deg,#15171B,#2B303A)' : 'linear-gradient(135deg,#170F12,#311116)', display: 'grid', placeItems: 'center', color: '#FFFFFF22', fontSize: 36, fontWeight: 950 }}>BB</div><div style={{ color: TEXT, fontWeight: 950 }}>{name}</div><div style={{ display: 'flex', justifyContent: 'space-between', color: MUTED, fontSize: 10, marginTop: 6 }}><span>{count}</span><span style={{ color: RED, fontWeight: 900 }}>{price}</span></div></Card>)}</div>;
}

function Campaign() {
  const [scheduled, setScheduled] = useState(false);
  return <div style={{ display: 'grid', gap: 12 }}><div><div style={{ color: RED, fontSize: 10, fontWeight: 950 }}>CAMPAIGN COMPOSER</div><h1 style={{ color: TEXT, fontSize: 25, margin: '8px 0 5px' }}>حملة العودة للمدارس</h1><p style={{ color: MUTED, fontSize: 12, margin: 0 }}>Brand Box جهّز الفكرة، الزوايا، القنوات وجدول التنفيذ.</p></div><Card><div style={{ color: MUTED, fontSize: 10 }}>الهدف</div><div style={{ color: TEXT, fontWeight: 900, marginTop: 5 }}>زيادة طلبات التسجيل للمدارس الخاصة</div></Card><Card><div style={{ color: MUTED, fontSize: 10 }}>المحتوى المقترح</div><div style={{ display: 'grid', gap: 8, marginTop: 10 }}>{['بوستر افتتاح التسجيل', 'Carousel: لماذا تختار مدرستنا؟', 'Reel قصير للبيئة التعليمية', 'منشور توظيف معلمين'].map((x, i) => <div key={x} style={{ display: 'flex', gap: 9, alignItems: 'center', background: RAISED, padding: 10, borderRadius: 12 }}><span style={{ color: RED, fontWeight: 950 }}>{String(i + 1).padStart(2, '0')}</span><span style={{ color: TEXT, fontSize: 12 }}>{x}</span></div>)}</div></Card><Card><div style={{ display: 'flex', justifyContent: 'space-between' }}><div><div style={{ color: TEXT, fontWeight: 900 }}>جدولة القنوات</div><div style={{ color: MUTED, fontSize: 10, marginTop: 4 }}>Facebook · Instagram · TikTok</div></div><Pill tone={scheduled ? '#66D19E' : '#FFBF4B'}>{scheduled ? 'مجدول' : 'مسودة'}</Pill></div><div style={{ marginTop: 12 }}><Button onClick={() => setScheduled(true)}>{scheduled ? 'تمت الجدولة للمراجعة' : 'جدولة بعد المراجعة'}</Button></div></Card></div>;
}

function Social() {
  return <div style={{ display: 'grid', gap: 12 }}><div><div style={{ color: RED, fontSize: 10, fontWeight: 950 }}>SOCIAL CONNECTIONS</div><h1 style={{ color: TEXT, fontSize: 25, margin: '8px 0 5px' }}>الحسابات المتصلة</h1><p style={{ color: MUTED, fontSize: 12, margin: 0, lineHeight: 1.6 }}>الأسرار والتوكنات تبقى مشفرة على الخادم فقط. التطبيق يرى حالة الاتصال لا بيانات الاعتماد.</p></div>{socialRows.map((row) => <Card key={row.name}><div style={{ display: 'flex', gap: 11, alignItems: 'center' }}><div style={{ width: 40, height: 40, borderRadius: 13, display: 'grid', placeItems: 'center', background: RAISED, color: TEXT, fontWeight: 950 }}>{row.icon}</div><div style={{ flex: 1 }}><div style={{ color: TEXT, fontWeight: 900, fontSize: 13 }}>{row.name}</div><div style={{ color: row.tone, fontSize: 10, marginTop: 4 }}>{row.state}</div></div><span style={{ color: MUTED }}>‹</span></div></Card>)}<Card style={{ borderColor: '#66D19E33' }}><div style={{ color: '#66D19E', fontWeight: 900, fontSize: 12 }}>✓ طبقة الأمان جاهزة</div><p style={{ color: MUTED, fontSize: 10, lineHeight: 1.6, marginBottom: 0 }}>OAuth state أحادي الاستخدام · AES-256-GCM · Refresh server-side · Disconnect owner-scoped.</p></Card></div>;
}

export default function MobileReviewPage() {
  const [screen, setScreen] = useState<ScreenId>('home');
  const [showInfo, setShowInfo] = useState(false);
  const activeLabel = useMemo(() => nav.find((item) => item.id === screen)?.label || (screen === 'social' ? 'السوشيال' : 'الحملة'), [screen]);

  const content = screen === 'home' ? <Home go={setScreen} /> : screen === 'create' ? <Create go={setScreen} /> : screen === 'projects' ? <Projects /> : screen === 'trends' ? <Trends go={setScreen} /> : screen === 'store' ? <Store /> : screen === 'campaign' ? <Campaign /> : <Social />;

  return (
    <div dir="rtl" style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'radial-gradient(circle at 25% 10%, #260B10 0, #0B0C0F 30%, #050607 72%)', overflow: 'auto', fontFamily: 'Tajawal, Arial, sans-serif', color: TEXT }}>
      <div style={{ minHeight: '100%', display: 'grid', gridTemplateColumns: 'minmax(250px, 360px) minmax(340px, 430px)', gap: 34, alignItems: 'center', justifyContent: 'center', padding: 28 }}>
        <aside style={{ maxWidth: 360 }}>
          <div style={{ display: 'flex', gap: 9, alignItems: 'center', marginBottom: 18 }}><div style={{ width: 34, height: 34, borderRadius: 10, background: RED, display: 'grid', placeItems: 'center', color: 'white', fontWeight: 950 }}>B</div><div><div style={{ fontWeight: 950, fontSize: 18 }}>Brand Box AI</div><div style={{ color: MUTED, fontSize: 10, letterSpacing: 1.1 }}>MOBILE REVIEW BUILD</div></div></div>
          <h2 style={{ fontSize: 32, lineHeight: 1.25, margin: '0 0 12px' }}>نسخة التطبيق جاهزة للمراجعة التفاعلية.</h2>
          <p style={{ color: MUTED, lineHeight: 1.8, fontSize: 13 }}>هذه الواجهة تعكس اتجاه تطبيق Expo/React Native الحالي وتتيح لك مراجعة التسلسل، اللغة، البطاقات، الهوية والتنقل قبل تفعيل حسابات السوشيال الحقيقية.</p>
          <div style={{ display: 'grid', gap: 8, marginTop: 20 }}>
            {['الرئيسية + الرصيد والمشاريع', 'استوديو AI + Campaign Composer', 'الترند وتحويله إلى حملة', 'المتجر الرقمي والخدمات', 'OAuth والسوشيال ودورة حياة الاتصال', 'جدولة آمنة وراء Publishing Gate'].map((x) => <div key={x} style={{ display: 'flex', gap: 8, color: '#C9CDD5', fontSize: 12 }}><span style={{ color: RED }}>●</span>{x}</div>)}
          </div>
          <button onClick={() => setShowInfo((v) => !v)} style={{ marginTop: 20, background: 'transparent', border: `1px solid ${BORDER}`, color: TEXT, borderRadius: 12, padding: '10px 14px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 800 }}>{showInfo ? 'إخفاء ملاحظات النسخة' : 'عرض ملاحظات النسخة'}</button>
          {showInfo ? <div style={{ marginTop: 10, padding: 13, borderRadius: 14, background: '#101217', border: `1px solid ${BORDER}`, color: MUTED, fontSize: 11, lineHeight: 1.7 }}>البيانات داخل نسخة المراجعة تجريبية عمدًا. تسجيل الدخول الحقيقي، المشاريع الفعلية، الرصيد، والتوكنات لا يتم كشفها هنا. النشر الخارجي ما زال مقفلاً حتى اعتماد مفاتيح وصلاحيات المنصات.</div> : null}
        </aside>

        <div style={{ justifySelf: 'center', width: '100%', maxWidth: 410 }}>
          <div style={{ background: '#030405', border: '1px solid #2C3037', borderRadius: 42, padding: 10, boxShadow: '0 34px 90px #00000088, 0 0 0 1px #ffffff08 inset' }}>
            <div style={{ height: 'min(790px, calc(100vh - 76px))', minHeight: 620, background: BG, borderRadius: 34, overflow: 'hidden', position: 'relative', display: 'flex', flexDirection: 'column' }}>
              <div style={{ height: 26, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 18px', color: MUTED, fontSize: 9 }}><span>02:07</span><span style={{ width: 76, height: 18, background: '#020203', borderRadius: 999 }} /><span>5G ▰</span></div>
              <div style={{ padding: '8px 16px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${BORDER}` }}><div><div style={{ color: MUTED, fontSize: 9 }}>BRAND BOX AI</div><div style={{ color: TEXT, fontSize: 13, fontWeight: 900, marginTop: 2 }}>{activeLabel}</div></div><div style={{ width: 34, height: 34, borderRadius: 12, background: RED, display: 'grid', placeItems: 'center', fontWeight: 950 }}>B</div></div>
              <div style={{ flex: 1, overflowY: 'auto', padding: '16px 15px 94px', scrollbarWidth: 'none' }}>{content}</div>
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: '#0B0D11EE', backdropFilter: 'blur(18px)', borderTop: `1px solid ${BORDER}`, padding: '9px 8px 13px', display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 2 }}>
                {nav.map((item) => { const active = item.id === screen; return <button key={item.id} onClick={() => setScreen(item.id)} style={{ border: 0, background: 'transparent', color: active ? RED : MUTED, cursor: 'pointer', fontFamily: 'inherit', padding: 3 }}><div style={{ fontSize: 18, lineHeight: 1 }}>{item.icon}</div><div style={{ fontSize: 8, marginTop: 5, fontWeight: active ? 950 : 700 }}>{item.label}</div></button>; })}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 7, marginTop: 14 }}><button onClick={() => setScreen('campaign')} style={{ border: `1px solid ${BORDER}`, background: SURFACE, color: TEXT, borderRadius: 999, padding: '8px 12px', fontFamily: 'inherit', cursor: 'pointer', fontSize: 10 }}>الحملة</button><button onClick={() => setScreen('social')} style={{ border: `1px solid ${BORDER}`, background: SURFACE, color: TEXT, borderRadius: 999, padding: '8px 12px', fontFamily: 'inherit', cursor: 'pointer', fontSize: 10 }}>السوشيال</button></div>
        </div>
      </div>
      <style jsx global>{`@media (max-width: 850px){ body{overflow:hidden!important}.brandbox-theme-scope{padding-top:0!important}.brandbox-theme-scope>nav{display:none!important} } @media (max-width:850px){ div[dir='rtl']>div{grid-template-columns:1fr!important;padding:0!important} div[dir='rtl'] aside{display:none!important} div[dir='rtl'] aside + div{max-width:none!important;width:100%!important} }`}</style>
    </div>
  );
}
