'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarRange, MessageSquareText, Rocket, Target, Users } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { createUserProject } from '../../lib/projects/projects-service';

const DURATIONS = ['30 يومًا', '60 يومًا', '90 يومًا', '6 أشهر'];

export default function MarketingPlansPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [form, setForm] = useState({ business: '', industry: '', goal: '', audience: '', duration: '90 يومًا' });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const setField = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  async function createPlanProject(event) {
    event.preventDefault();
    if (loading || creating) return;
    if (!user) {
      router.push('/auth?next=%2Fmarketing-plans');
      return;
    }
    if (!form.business.trim() || !form.goal.trim()) {
      setError('أدخل اسم النشاط والهدف التسويقي على الأقل.');
      return;
    }

    setCreating(true);
    setError('');
    try {
      const description = [
        `إعداد خطة تسويقية لنشاط: ${form.business.trim()}.`,
        form.industry.trim() ? `القطاع: ${form.industry.trim()}.` : '',
        `الهدف الرئيسي: ${form.goal.trim()}.`,
        form.audience.trim() ? `الجمهور المستهدف: ${form.audience.trim()}.` : '',
        `مدة الخطة: ${form.duration}.`,
        'ابدأ بتحليل الوضع الحالي، ثم الأهداف، شرائح الجمهور، الرسائل الأساسية، قنوات التسويق، خطة المحتوى، الحملات، مؤشرات الأداء، وجدول تنفيذ عملي.',
      ].filter(Boolean).join(' ');

      const project = await createUserProject({
        name: `خطة تسويقية — ${form.business.trim()}`,
        type: 'محادثة',
        industry: form.industry.trim() || 'عام',
        targetAudience: form.audience.trim() || null,
        description,
        language: 'العربية',
        tone: 'احترافي',
      });

      router.push(`/projects/chat/workspace?project=${encodeURIComponent(project.id)}`);
    } catch (err) {
      setError(err?.message || 'تعذر إنشاء مشروع الخطة التسويقية.');
      setCreating(false);
    }
  }

  return (
    <main dir="rtl" className="min-h-[calc(100vh-5rem)] bg-[#050608] text-white">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="overflow-hidden rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(243,19,37,.18),transparent_38%),#0b0d12] p-6 sm:p-9 lg:p-12">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#f31325]/25 bg-[#f31325]/8 px-4 py-2 text-xs font-black text-red-300"><Rocket size={15} /> التخطيط الذكي</div>
            <h1 className="mt-6 text-4xl font-black leading-tight sm:text-5xl">حوّل هدفك إلى مشروع تسويقي قابل للتنفيذ</h1>
            <p className="mt-5 max-w-2xl text-sm leading-8 text-gray-400 sm:text-base">أدخل أساسيات النشاط، وسننشىء لك مشروع شات مخصص للخطة. كل المناقشات والمخرجات ستبقى مرتبطة بالمشروع نفسه بدل أن تضيع بين المحادثات.</p>
          </div>
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
          <form onSubmit={createPlanProject} className="rounded-3xl border border-white/10 bg-[#0d1016] p-5 sm:p-7">
            <h2 className="text-lg font-black">ابدأ مشروع الخطة</h2>
            <p className="mt-1 text-xs leading-6 text-gray-500">لن يتم تشغيل نموذج AI أو خصم نقاط قبل أن تدخل Workspace وتبدأ المحادثة بنفسك.</p>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <label className="text-xs font-bold text-gray-400">اسم النشاط
                <input value={form.business} onChange={(event) => setField('business', event.target.value)} placeholder="مثال: Brand Box" className="mt-2 w-full rounded-xl border border-white/10 bg-[#151820] px-4 py-3 text-sm text-white outline-none focus:border-[#f31325]/60" />
              </label>
              <label className="text-xs font-bold text-gray-400">القطاع
                <input value={form.industry} onChange={(event) => setField('industry', event.target.value)} placeholder="مثال: التعليم، المطاعم، العقارات" className="mt-2 w-full rounded-xl border border-white/10 bg-[#151820] px-4 py-3 text-sm text-white outline-none focus:border-[#f31325]/60" />
              </label>
            </div>

            <label className="mt-4 block text-xs font-bold text-gray-400">الهدف التسويقي
              <textarea value={form.goal} onChange={(event) => setField('goal', event.target.value)} placeholder="مثال: زيادة الحجوزات وبناء حضور قوي على فيسبوك وتيك توك" className="mt-2 min-h-28 w-full resize-none rounded-xl border border-white/10 bg-[#151820] px-4 py-3 text-sm leading-7 text-white outline-none focus:border-[#f31325]/60" />
            </label>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="text-xs font-bold text-gray-400">الجمهور المستهدف
                <input value={form.audience} onChange={(event) => setField('audience', event.target.value)} placeholder="مثال: أولياء الأمور في بنغازي" className="mt-2 w-full rounded-xl border border-white/10 bg-[#151820] px-4 py-3 text-sm text-white outline-none focus:border-[#f31325]/60" />
              </label>
              <label className="text-xs font-bold text-gray-400">مدة الخطة
                <select value={form.duration} onChange={(event) => setField('duration', event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-[#151820] px-4 py-3 text-sm text-white outline-none focus:border-[#f31325]/60">
                  {DURATIONS.map((duration) => <option key={duration}>{duration}</option>)}
                </select>
              </label>
            </div>

            {error && <div className="mt-4 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-xs font-bold text-red-300">{error}</div>}
            <button type="submit" disabled={creating || loading} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#f31325] px-5 py-3.5 text-sm font-black transition hover:bg-[#ff2637] disabled:opacity-50"><MessageSquareText size={18} /> {creating ? 'جاري إنشاء مشروع الخطة...' : user ? 'إنشاء المشروع وفتح مساعد التخطيط' : 'سجّل الدخول لبدء الخطة'}</button>
          </form>

          <aside className="space-y-4">
            {[
              [Target, 'أهداف واضحة', 'حوّل الهدف التجاري إلى نتائج ومؤشرات أداء قابلة للقياس.'],
              [Users, 'جمهور ورسائل', 'نظّم شرائح الجمهور والرسائل والقنوات المناسبة لكل شريحة.'],
              [CalendarRange, 'خطة تنفيذ', 'قسّم العمل إلى مراحل ومحتوى وحملات يمكن متابعتها داخل المشروع.'],
            ].map(([Icon, title, text]) => (
              <div key={title} className="rounded-2xl border border-white/10 bg-[#0d1016] p-5"><span className="grid h-11 w-11 place-items-center rounded-xl bg-[#f31325]/10 text-[#ff3344]"><Icon size={21} /></span><h3 className="mt-4 font-black">{title}</h3><p className="mt-2 text-xs leading-6 text-gray-500">{text}</p></div>
            ))}
          </aside>
        </div>
      </div>
    </main>
  );
}
