'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Bell,
  Database,
  Flag,
  Gauge,
  HardDrive,
  KeyRound,
  Loader2,
  Mail,
  Save,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  UserRoundCog,
  Users,
  Wrench,
} from 'lucide-react';
import { createBrowserSupabaseClient } from '../lib/supabase/client';

const SETTINGS_GROUPS = [
  { id: 'general', title: 'الإعدادات العامة', description: 'هوية المنصة والبيانات العامة واللغة والمنطقة الزمنية والعملات.', icon: Settings2 },
  { id: 'users', title: 'المستخدمون والتسجيل', description: 'سياسات إنشاء الحسابات والتحقق والجلسات.', icon: Users },
  { id: 'usage', title: 'الحدود والاستخدام', description: 'حدود الاستخدام العامة التي تبنى عليها حدود الخطط.', icon: SlidersHorizontal },
  { id: 'security', title: 'الأمان', description: 'المصادقة الإضافية والجلسات والعمليات الحساسة.', icon: ShieldCheck },
  { id: 'maintenance', title: 'وضع الصيانة', description: 'إيقاف الخدمة مؤقتًا مع رسالة واضحة واستثناء الإدارة.', icon: Wrench },
  { id: 'notifications', title: 'الإشعارات', description: 'قنوات الإشعارات العامة داخل المنصة والبريد والدفع.', icon: Bell },
  { id: 'storage', title: 'التخزين والاحتفاظ', description: 'سياسات الاحتفاظ والضغط وCDN.', icon: HardDrive },
];

const FUTURE_GROUPS = [
  { title: 'Feature Flags', icon: Flag, note: 'سيتم ربطها بتجارب الإطلاق التدريجي ونسب التفعيل.' },
  { title: 'البريد والقوالب', icon: Mail, note: 'لن يتم كشف كلمات مرور SMTP أو أي أسرار داخل المتصفح.' },
  { title: 'تكاملات النظام', icon: KeyRound, note: 'مفاتيح AI والدفع والويب هوكس تبقى في بيئة الخادم فقط.' },
];

function SourceBadge({ value }) {
  const normalized = String(value || '').toLowerCase();
  const healthy = normalized === 'ok' || normalized === 'live' || normalized === 'healthy';
  return <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black ${healthy ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300' : 'border-white/10 bg-white/5 text-gray-400'}`}>{value || 'غير محدد'}</span>;
}

function Field({ definition, value, disabled, onChange }) {
  const common = 'w-full rounded-xl border border-white/10 bg-[#10131a] px-3 py-2.5 text-xs text-white outline-none focus:border-[#f31325]/50 disabled:cursor-not-allowed disabled:opacity-50';

  if (definition.valueType === 'boolean') {
    return (
      <button type="button" disabled={disabled} onClick={() => onChange(!Boolean(value))} className={`flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-xs font-black disabled:cursor-not-allowed disabled:opacity-50 ${value ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300' : 'border-white/10 bg-[#10131a] text-gray-400'}`}>
        <span>{definition.labelAr}</span><span>{value ? 'مفعّل' : 'معطّل'}</span>
      </button>
    );
  }

  return (
    <label className="block">
      <span className="mb-2 block text-[11px] font-bold text-gray-400">{definition.labelAr}</span>
      <input
        type={definition.valueType === 'number' ? 'number' : 'text'}
        min={definition.min}
        max={definition.max}
        value={value ?? ''}
        disabled={disabled}
        onChange={(event) => onChange(definition.valueType === 'number' ? Number(event.target.value) : event.target.value)}
        className={common}
      />
    </label>
  );
}

export default function AdminSettingsHub({ sources = {} }) {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [settings, setSettings] = useState({});
  const [original, setOriginal] = useState({});
  const [definitions, setDefinitions] = useState([]);
  const [capabilities, setCapabilities] = useState({ canManageSettings: false, canManageSecurity: false });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function token() {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token || '';
  }

  async function loadSettings() {
    setLoading(true); setError('');
    try {
      const accessToken = await token();
      if (!accessToken) throw new Error('انتهت جلسة الدخول.');
      const response = await fetch('/api/v1/admin/settings', { headers: { Authorization: `Bearer ${accessToken}` }, cache: 'no-store' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'تعذر تحميل الإعدادات.');
      setSettings(payload.settings || {});
      setOriginal(payload.settings || {});
      setDefinitions(Array.isArray(payload.definitions) ? payload.definitions : []);
      setCapabilities(payload.capabilities || { canManageSettings: false, canManageSecurity: false });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر تحميل الإعدادات.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadSettings(); }, []);

  const dirtySettings = useMemo(() => {
    const changed = {};
    for (const [key, value] of Object.entries(settings)) {
      if (JSON.stringify(value) !== JSON.stringify(original[key])) changed[key] = value;
    }
    return changed;
  }, [settings, original]);

  const dirtyCount = Object.keys(dirtySettings).length;

  async function saveSettings() {
    if (!dirtyCount) return;
    setSaving(true); setError(''); setMessage('');
    try {
      const accessToken = await token();
      if (!accessToken) throw new Error('انتهت جلسة الدخول.');
      const response = await fetch('/api/v1/admin/settings', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: dirtySettings }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'تعذر حفظ الإعدادات.');
      setOriginal((current) => ({ ...current, ...dirtySettings }));
      setMessage('تم حفظ الإعدادات وتسجيل العملية في سجل التدقيق.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر حفظ الإعدادات.');
    } finally {
      setSaving(false);
    }
  }

  const definitionsByCategory = useMemo(() => {
    const map = new Map();
    for (const definition of definitions) {
      if (!map.has(definition.category)) map.set(definition.category, []);
      map.get(definition.category).push(definition);
    }
    return map;
  }, [definitions]);

  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-white/10 bg-[#0d1016] p-5 sm:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="text-[10px] font-black tracking-[.18em] text-[#ff6674]">ADMIN SETTINGS</div>
            <h2 className="mt-2 text-xl font-black">مركز إعدادات المنصة</h2>
            <p className="mt-2 max-w-3xl text-xs leading-6 text-gray-500">إعدادات غير سرية تُقرأ وتُحفظ عبر API محمي. الأسرار ومفاتيح الخدمات لا يتم إرسالها إلى المتصفح.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/home-content" className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#10131a] px-4 py-3 text-xs font-black hover:border-[#f31325]/40"><UserRoundCog size={16} className="text-[#ff3344]" /> محتوى الصفحة الرئيسية</Link>
            <a href="/api/health" target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-xs font-black text-emerald-300"><Gauge size={16} /> حالة الخدمة</a>
            {capabilities.canManageSettings && <button disabled={saving || !dirtyCount} onClick={() => void saveSettings()} className="flex items-center gap-2 rounded-xl bg-[#f31325] px-4 py-3 text-xs font-black disabled:opacity-40">{saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} حفظ {dirtyCount ? `(${dirtyCount})` : ''}</button>}
          </div>
        </div>
      </section>

      {error && <div className="rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-xs text-red-200">{error}</div>}
      {message && <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-200">{message}</div>}

      {loading ? (
        <div className="grid min-h-60 place-items-center rounded-3xl border border-white/10 bg-[#0d1016]"><div className="flex items-center gap-3 text-sm text-gray-500"><Loader2 className="animate-spin text-[#ff3344]" size={18} /> جاري تحميل الإعدادات...</div></div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {SETTINGS_GROUPS.map(({ id, title, description, icon: Icon }) => {
            const fields = definitionsByCategory.get(id) || [];
            const securityLocked = id === 'security' && !capabilities.canManageSecurity;
            const disabled = !capabilities.canManageSettings || securityLocked;
            return (
              <section key={id} className="rounded-3xl border border-white/10 bg-[#0d1016] p-5">
                <div className="flex items-start gap-3">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-[#f31325]/20 bg-[#f31325]/8 text-[#ff3344]"><Icon size={20} /></span>
                  <div><h3 className="font-black">{title}</h3><p className="mt-1 text-xs leading-6 text-gray-500">{description}</p></div>
                </div>
                {securityLocked && <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-[11px] text-amber-200">هذه الإعدادات تتطلب صلاحية security.manage.</div>}
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {fields.map((definition) => <Field key={definition.key} definition={definition} value={settings[definition.key]} disabled={disabled} onChange={(value) => setSettings((current) => ({ ...current, [definition.key]: value }))} />)}
                </div>
              </section>
            );
          })}
        </div>
      )}

      <section className="grid gap-4 xl:grid-cols-3">
        {FUTURE_GROUPS.map(({ title, icon: Icon, note }) => <div key={title} className="rounded-3xl border border-white/10 bg-[#0d1016] p-5"><div className="flex items-center gap-2 font-black"><Icon size={18} className="text-[#ff3344]" /> {title}</div><p className="mt-3 text-xs leading-6 text-gray-500">{note}</p><div className="mt-4 text-[10px] font-black text-amber-300">محجوز للمرحلة التالية</div></div>)}
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <div className="rounded-3xl border border-white/10 bg-[#0d1016] p-5">
          <div className="flex items-center gap-2 font-black"><Database size={18} className="text-emerald-300" /> مصادر البيانات الحالية</div>
          <div className="mt-4 space-y-2">{Object.entries(sources).length ? Object.entries(sources).map(([key, value]) => <div key={key} className="flex items-center justify-between gap-3 rounded-xl border border-white/[.07] bg-[#10131a] px-4 py-3 text-xs"><span className="font-mono text-gray-400">{key}</span><SourceBadge value={value} /></div>) : <div className="rounded-xl border border-white/[.07] bg-[#10131a] px-4 py-6 text-center text-xs text-gray-600">لا توجد مصادر معلنة حاليًا.</div>}</div>
        </div>
        <div className="rounded-3xl border border-amber-500/15 bg-amber-500/5 p-5">
          <div className="flex items-center gap-2 font-black text-amber-200"><KeyRound size={18} /> قاعدة الأمان</div>
          <div className="mt-4 space-y-3 text-xs leading-6 text-amber-100/70"><p>لا يتم تخزين مفاتيح API أو كلمات المرور أو أسرار SMTP داخل هذه الإعدادات.</p><p>كل تعديل ناجح يُسجل في Audit Log، بينما إعدادات الأمان تتطلب صلاحية مستقلة فوق settings.manage.</p><p>Production لن يتم تعديلها من هذه المرحلة؛ migration الجديدة تظل للمراجعة والتطبيق على Staging أولًا.</p></div>
        </div>
      </section>
    </div>
  );
}
