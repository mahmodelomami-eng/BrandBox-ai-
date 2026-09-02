import Image from 'next/image';
import {
  BarChart3,
  Boxes,
  ChevronLeft,
  ChevronRight,
  Heart,
  ImageIcon,
  LayoutTemplate,
  Music2,
  Palette,
  Settings2,
  Type,
} from 'lucide-react';

const NAV_ITEMS = [
  [Boxes, 'المشاريع', true],
  [ImageIcon, 'الصور', false],
  [Type, 'الخطوط', false],
  [LayoutTemplate, 'القوالب', false],
  [Music2, 'الموسيقى', false],
  [Palette, 'العلامة التجارية', false],
  [Settings2, 'الإعدادات', false],
];

const THUMBNAILS = [
  ['/brandbox-dashboard-preview.jpg', 'تصميم مدينة إبداعي', 'object-left'],
  ['/brandbox-login-visual.jpg', 'تصميم هوية بصرية', 'object-center'],
  ['/brandbox-dashboard-preview.jpg', 'تصميم منتج', 'object-center'],
  ['/brandbox-login-visual.jpg', 'تصميم حملة إعلانية', 'object-right'],
];

export default function MarketingDashboardPreview({ compact = false, className = '' }) {
  return (
    <div
      dir="ltr"
      className={`bb-panel overflow-hidden rounded-[30px] border shadow-[var(--bb-shadow-lg)] ${className}`}
      aria-label="معاينة واجهة Brand Box"
    >
      <div className={`grid ${compact ? 'min-h-[330px] grid-cols-[104px_1fr]' : 'min-h-[410px] grid-cols-[126px_1fr] sm:grid-cols-[150px_1fr]'}`}>
        <aside dir="rtl" className="bb-surface-1 border-r bb-border-subtle px-3 py-4 sm:px-4 sm:py-5">
          <div className="mb-5 flex items-center gap-2 px-2">
            <Image src="/brandbox-logo.png" alt="Brand Box" width={28} height={28} className="h-7 w-7 object-contain" />
            {!compact && <span className="bb-text-primary text-xs font-black">Brand <span className="bb-text-accent">Box</span></span>}
          </div>
          <div className="space-y-1.5">
            {NAV_ITEMS.map(([Icon, label, active]) => (
              <div
                key={label}
                className={`flex items-center gap-2 rounded-xl px-2.5 py-2 text-[10px] font-bold sm:text-[11px] ${active ? 'bb-accent-soft border' : 'bb-text-tertiary border border-transparent'}`}
              >
                <Icon size={compact ? 13 : 14} />
                <span className={compact ? 'hidden sm:inline' : ''}>{label}</span>
              </div>
            ))}
          </div>
        </aside>

        <section dir="rtl" className="bb-surface-2 min-w-0 p-3 sm:p-5">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <div className="bb-text-primary text-sm font-black sm:text-base">أهلاً بك في <span className="bb-text-accent">Brand Box</span></div>
              <div className="bb-text-tertiary mt-1 text-[9px] sm:text-[10px]">ملخص الأداء الإبداعي لهذا الشهر</div>
            </div>
            <span className="bb-card bb-text-secondary rounded-lg border px-2.5 py-1.5 text-[9px]">آخر 30 يوم</span>
          </div>

          <div className="bb-card grid gap-3 rounded-2xl border p-3 sm:grid-cols-[112px_1fr] sm:p-4">
            <div className="grid place-items-center">
              <div
                className="relative grid h-24 w-24 place-items-center rounded-full"
                style={{ background: 'conic-gradient(var(--bb-accent) 0deg 313deg, var(--bb-border-subtle) 313deg 360deg)' }}
              >
                <div className="bb-surface-2 grid h-[72px] w-[72px] place-items-center rounded-full text-center shadow-inner">
                  <div>
                    <div className="bb-text-primary text-2xl font-black leading-none">87</div>
                    <div className="bb-text-tertiary mt-1 text-[9px] font-bold">ممتاز</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="min-w-0">
              <div className="mb-2 flex items-center justify-between">
                <div className="bb-text-primary flex items-center gap-1.5 text-[10px] font-black sm:text-xs"><BarChart3 size={13} className="bb-text-accent" /> أداء تصاميمك</div>
                <div className="bb-text-disabled text-[8px]">100</div>
              </div>
              <svg viewBox="0 0 360 118" className="h-[88px] w-full overflow-visible" role="img" aria-label="مخطط أداء تصاميمك">
                {[18, 43, 68, 93].map((y) => <line key={y} x1="0" x2="360" y1={y} y2={y} stroke="var(--bb-border-subtle)" strokeWidth="1" />)}
                <defs>
                  <linearGradient id="bbChartFill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="var(--bb-accent)" stopOpacity="0.18" />
                    <stop offset="100%" stopColor="var(--bb-accent)" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d="M4 80 L50 66 L94 83 L138 72 L181 64 L222 48 L263 78 L309 58 L356 24 L356 110 L4 110 Z" fill="url(#bbChartFill)" />
                <polyline points="4,80 50,66 94,83 138,72 181,64 222,48 263,78 309,58 356,24" fill="none" stroke="var(--bb-accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                {[['4','80'],['50','66'],['94','83'],['138','72'],['181','64'],['222','48'],['263','78'],['309','58'],['356','24']].map(([x,y]) => <circle key={`${x}-${y}`} cx={x} cy={y} r="3.5" fill="var(--bb-accent)" />)}
              </svg>
              <div className="bb-text-disabled mt-1 grid grid-cols-5 text-center text-[7px] sm:text-[8px]"><span>5 مايو</span><span>12 مايو</span><span>19 مايو</span><span>26 مايو</span><span>2 يونيو</span></div>
              {!compact && <div className="bb-text-tertiary mt-2 text-[9px]">أداؤك أفضل من 87% من المستخدمين هذا الشهر.</div>}
            </div>
          </div>

          <div className="mt-4">
            <div className="mb-2.5 flex items-center justify-between gap-2">
              <div className="bb-text-primary text-xs font-black">تصاميم ملهمة</div>
              <div className="flex items-center gap-2">
                {!compact && <button type="button" tabIndex={-1} className="bb-text-tertiary text-[9px]">عرض الكل</button>}
                <span className="bb-button-secondary grid h-7 w-7 place-items-center rounded-lg border"><ChevronRight size={13} /></span>
                <span className="bb-button-secondary grid h-7 w-7 place-items-center rounded-lg border"><ChevronLeft size={13} /></span>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {THUMBNAILS.map(([src, alt, objectPosition], idx) => (
                <div key={`${alt}-${idx}`} className={`relative overflow-hidden rounded-xl border bb-border-subtle ${compact ? 'h-16 sm:h-20' : 'h-20 sm:h-24'}`}>
                  <Image src={src} alt={alt} fill unoptimized className={`object-cover ${objectPosition}`} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent" />
                  <span className="absolute bottom-1.5 left-1.5 grid h-5 w-5 place-items-center rounded-full bg-black/45 text-white backdrop-blur"><Heart size={10} /></span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
