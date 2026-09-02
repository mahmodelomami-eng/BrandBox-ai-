'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Bell,
  Calculator,
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
  { id: 'finance', title: 'التكلفة وسعر الصرف', description: 'سعر صرف الدولار والعمولات وهامش الربح المستخدم في حاسبة تكلفة أدوات AI.', icon: Calculator },
  { id: 'features', title: 'Feature Flags', description: 'تشغيل الميزات التجريبية والتحكم في نسب الإطلاق التدريجي.', icon: Flag },
];

const FUTURE_GROUPS = [
  { title: 'البريد والقوالب', icon: Mail, note: 'لن يتم كشف كلمات مرور SMTP أو أي أسرار داخل المتصفح.' },
  { title: 'تكاملات النظام', icon: KeyRound, note: 'مفاتيح AI والدفع والويب هوكس تبقى في بيئة الخادم فقط.' },
];

function SourceBadge({ value }) {
  const normalized = String(value || '').toLowerCase();
  const healthy = normalized === 'ok' || normalized === 'live' || normalized === 'healthy';
  return <span className="rounded-full border px-2.5 py-1 text-[10px] font-black" style={{ background: healthy ? 'var(--bb-success-soft)' : 'var(--bb-hover)', color: healthy ? 'var(--bb-success)' : 'var(--bb-text-secondary)', borderColor: healthy ? 'color-mix(in srgb, var(--bb-success) 25%, transparent)' : 'var(--bb-border)' }}>{value || 'غير محدد'}</span>;
}

function Field({ definition, value, disabled, onChange }) {
  if (definition.valueType === 'boolean') {
    return (
      <button type="button" disabled={disabled} onClick={() => onChange(!Boolean(value))} className="bb-button-secondary flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-xs font-black disabled:cursor-not-allowed disabled:opacity-50" style={value ? { background: 'var(--bb-success-soft)', color: 'var(--bb-success)', borderColor: 'color-mix(in srgb, var(--bb-success) 25%, transparent)' } : undefined}>
        <span>{definition.labelAr}</span><span>{value ? 'مفعّل' : 'معطّل'}</span>
      </button>
    );
  }

  return (
    <label className="block">
      <span className="bb-text-secondary mb-2 block text-[11px] font-bold">{definition.labelAr}</span>
      <input
        type={definition.valueType === 'number' ? 'number' : 'text'}
        min={definition.min}
        max={definition.max}
        value={value ?? ''}
        disabled={disabled}
        onChange={(event) => onChange(definition.valueType === 'number' ? Number(event.target.value) : event.target.value)}
        className="bb-input w-full rounded-xl border px-3 py-2.5 text-xs outline-none disabled:cursor-not-allowed disabled:opacity-50"
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
  const [providerCostUsd, setProviderCostUsd] = useState(0.01);

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

  useEffect(() => {
    const timeout = window.setTimeout(() => { void loadSettings(); }, 0);
    return () => window.clearTimeout(timeout);
  }, []);

  const dirtySettings = useMemo(() => {
    const changed = {};
    for (const [key, value] of Object.entries(settings)) {
      if (JSON.stringify(value) !== JSON.stringify(original[key])) changed[key] = value;
    }
    return changed;
  }, [settings, original]);

  const dirtyCount = Object.keys(dirtySettings).length;

  const costCalculator = useMemo(() => {
    const usdToLyd = Number(settings['finance.usd_lyd_rate'] ?? 11);
    const bankCommission = Number(settings['finance.bank_commission_percent'] ?? 0);
    const targetMargin = Number(settings['finance.target_margin_percent'] ?? 30);
    const providerUsd = Math.max(0, Number(providerCostUsd) || 0);
    const providerLyd = providerUsd * usdToLyd;
    const bankFeeLyd = providerLyd * (bankCommission / 100);
    const landedCostLyd = providerLyd + bankFeeLyd;
    const suggestedPriceLyd = landedCostLyd * (1 + targetMargin / 100);
    return { usdToLyd, bankCommission, targetMargin, providerUsd, providerLyd, bankFeeLyd, landedCostLyd, suggestedPriceLyd };
  }, [providerCostUsd, settings]);

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
      <section className="bb-panel rounded-3xl border p-5 sm:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="bb-text-accent text-[10px] font-black tracking-[.18em]">ADMIN SETTINGS</div>
            <h2 className="mt-2 text-xl font-black">مركز إعدادات المنصة</h2>
            <p className="bb-text-tertiary mt-2 max-w-3xl text-xs leading-6">إعدادات غير سرية تُقرأ وتُحفظ عبر API محمي. الأسرار ومفاتيح الخدمات لا يتم إرسالها إلى المتصفح.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/home-content" className="bb-button-secondary flex items-center gap-2 rounded-xl border px-4 py-3 text-xs font-black"><UserRoundCog size={16} className="bb-text-accent" /> محتوى الصفحة الرئيسية</Link>
            <a href="/api/health" target="_blank" rel="noreferrer" className="bb-button-secondary flex items-center gap-2 rounded-xl border px-4 py-3 text-xs font-black"><Gauge size={16} style={{ color: 'var(--bb-success)' }} /> حالة الخدمة</a>
            {capabilities.canManageSettings && <button disabled={saving || !dirtyCount} onClick={() => void saveSettings()} className="bb-button-primary flex items-center gap-2 rounded-xl px-4 py-3 text-xs font-black disabled:opacity-40">{saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} حفظ {dirtyCount ? `(${dirtyCount})` : ''}</button>}
          </div>
        </div>
      </section>

      {error && <div className="bb-danger-surface rounded-2xl border px-4 py-3 text-xs">{error}</div>}
      {message && <div className="rounded-2xl border px-4 py-3 text-xs" style={{ background: 'var(--bb-success-soft)', color: 'var(--bb-success)', borderColor: 'color-mix(in srgb, var(--bb-success) 28%, transparent)' }}>{message}</div>}

      {loading ? (
        <div className="bb-panel grid min-h-60 place-items-center rounded-3xl border"><div className="bb-text-tertiary flex items-center gap-3 text-sm"><Loader2 className="bb-text-accent animate-spin" size={18} /> جاري تحميل الإعدادات...</div></div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {SETTINGS_GROUPS.map(({ id, title, description, icon: Icon }) => {
            const fields = definitionsByCategory.get(id) || [];
            const securityLocked = id === 'security' && !capabilities.canManageSecurity;
            const disabled = !capabilities.canManageSettings || securityLocked;
            return (
              <section key={id} className="bb-card rounded-3xl border p-5">
                <div className="flex items-start gap-3">
                  <span className="bb-accent-soft grid h-11 w-11 shrink-0 place-items-center rounded-xl border"><Icon size={20} /></span>
                  <div><h3 className="font-black">{title}</h3><p className="bb-text-tertiary mt-1 text-xs leading-6">{description}</p></div>
                </div>
                {securityLocked && <div className="bb-warning-surface mt-4 rounded-xl border p-3 text-[11px]">هذه الإعدادات تتطلب صلاحية security.manage.</div>}
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {fields.map((definition) => <Field key={definition.key} definition={definition} value={settings[definition.key]} disabled={disabled} onChange={(value) => setSettings((current) => ({ ...current, [definition.key]: value }))} />)}
                </div>
              </section>
            );
          })}
        </div>
      )}

      <section className="bb-panel rounded-3xl border p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="bb-accent-soft grid h-11 w-11 shrink-0 place-items-center rounded-xl border"><Calculator size={20} /></span>
          <div><h3 className="font-black">حاسبة تكلفة أدوات AI</h3><p className="bb-text-tertiary mt-1 text-xs leading-6">أدخل تكلفة العملية بالدولار من المزود أو OpenRouter، وتحسب المنصة التكلفة المحلية بعد سعر الصرف وعمولة المصرف ثم السعر المقترح حسب هامش الربح.</p></div>
        </div>
        <div className="mt-5 grid gap-4 lg:grid-cols-[220px_1fr]">
          <label className="block">
            <span className="bb-text-secondary mb-2 block text-[11px] font-bold">تكلفة المزود بالدولار USD</span>
            <input type="number" min="0" step="0.0001" value={providerCostUsd} onChange={(event) => setProviderCostUsd(Number(event.target.value))} className="bb-input w-full rounded-xl border px-3 py-3 text-sm font-black outline-none" />
          </label>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricBox label="التكلفة بعد الصرف" value={`${costCalculator.providerLyd.toFixed(4)} د.ل`} note={`1 USD = ${costCalculator.usdToLyd} LYD`} />
            <MetricBox label="عمولة المصرف" value={`${costCalculator.bankFeeLyd.toFixed(4)} د.ل`} note={`${costCalculator.bankCommission}%`} tone="warning" />
            <MetricBox label="التكلفة الفعلية" value={`${costCalculator.landedCostLyd.toFixed(4)} د.ل`} note="قبل هامش الربح" tone="danger" />
            <MetricBox label="السعر المقترح" value={`${costCalculator.suggestedPriceLyd.toFixed(4)} د.ل`} note={`هامش ${costCalculator.targetMargin}%`} tone="success" />
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        {FUTURE_GROUPS.map(({ title, icon: Icon, note }) => <div key={title} className="bb-card rounded-3xl border p-5"><div className="flex items-center gap-2 font-black"><Icon size={18} className="bb-text-accent" /> {title}</div><p className="bb-text-tertiary mt-3 text-xs leading-6">{note}</p><div className="bb-text-warning mt-4 text-[10px] font-black">محجوز للمرحلة التالية</div></div>)}
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <div className="bb-panel rounded-3xl border p-5">
          <div className="flex items-center gap-2 font-black"><Database size={18} style={{ color: 'var(--bb-success)' }} /> مصادر البيانات الحالية</div>
          <div className="mt-4 space-y-2">{Object.entries(sources).length ? Object.entries(sources).map(([key, value]) => <div key={key} className="bb-card flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-xs"><span className="bb-text-secondary font-mono">{key}</span><SourceBadge value={value} /></div>) : <div className="bb-card bb-text-disabled rounded-xl border px-4 py-6 text-center text-xs">لا توجد مصادر معلنة حاليًا.</div>}</div>
        </div>
        <div className="bb-warning-surface rounded-3xl border p-5">
          <div className="flex items-center gap-2 font-black"><KeyRound size={18} /> قاعدة الأمان</div>
          <div className="mt-4 space-y-3 text-xs leading-6"><p>لا يتم تخزين مفاتيح API أو كلمات المرور أو أسرار SMTP داخل هذه الإعدادات.</p><p>كل تعديل ناجح يُسجل في Audit Log، بينما إعدادات الأمان تتطلب صلاحية مستقلة فوق settings.manage.</p><p>Production لن يتم تعديلها من هذه المرحلة؛ migration الجديدة تظل للمراجعة والتطبيق على Staging أولًا.</p></div>
        </div>
      </section>
    </div>
  );
}

function MetricBox({ label, value, note, tone = 'default' }) {
  const toneColor = tone === 'warning' ? 'var(--bb-warning)' : tone === 'danger' ? 'var(--bb-danger)' : tone === 'success' ? 'var(--bb-success)' : 'var(--bb-text-primary)';
  return <div className="bb-card rounded-2xl border p-4"><div className="bb-text-tertiary text-[10px]">{label}</div><div className="mt-2 text-lg font-black" style={{ color: toneColor }}>{value}</div><div className="bb-text-disabled mt-1 text-[10px]">{note}</div></div>;
}
