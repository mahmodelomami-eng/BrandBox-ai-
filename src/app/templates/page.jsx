import Link from 'next/link';
import { Flame } from 'lucide-react';
import TemplatesLivingLibrary from '../../components/TemplatesLivingLibrary';

export default function TemplatesPage() {
  return (
    <>
      <div dir="rtl" className="bb-app-canvas px-4 pt-5 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1500px]">
          <Link href="/templates/trends" className="bb-accent-soft flex items-center justify-between gap-4 rounded-2xl border px-4 py-3.5 transition hover:-translate-y-0.5 sm:px-5">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--bb-accent)] text-white"><Flame size={18} /></span>
              <div className="min-w-0"><div className="bb-text-primary text-sm font-black">🔥 Trend Lab — ترندات وبرومبتات متجددة</div><p className="bb-text-tertiary mt-1 truncate text-[10px] sm:text-xs">أفكار عربية، اجتماعية، ترفيهية وتجارية جاهزة للانتقال مباشرة إلى الصور والفيديو.</p></div>
            </div>
            <span className="bb-text-accent shrink-0 text-xs font-black">استكشف الآن ←</span>
          </Link>
        </div>
      </div>
      <TemplatesLivingLibrary />
    </>
  );
}
