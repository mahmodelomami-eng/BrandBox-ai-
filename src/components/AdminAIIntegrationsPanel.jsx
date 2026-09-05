'use client';

import { useEffect, useMemo, useState } from 'react';
import { Cpu, Database, KeyRound, Loader2, RefreshCw, ShieldCheck, Sparkles, ToggleLeft, ToggleRight } from 'lucide-react';
import { createBrowserSupabaseClient } from '../lib/supabase/client';

function money(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—';
  return `$${Number(value).toFixed(6)}`;
}

function modelStatus(model) {
  if (!model.is_enabled) return { label: 'معطّل', tone: 'danger' };
  if (!model.user_pricing_ready) return { label: 'غير مسعّر — إدارة فقط', tone: 'warning' };
  if (!model.is_visible_to_users) return { label: 'مفعّل ومخفي', tone: 'warning' };
  return { label: 'متاح للمستخدم', tone: 'success' };
}

function StatusBadge({ label, tone }) {
  const background = tone === 'success' ? 'var(--bb-success-soft)' : tone === 'danger' ? 'var(--bb-danger-soft)' : 'var(--bb-warning-soft)';
  const color = tone === 'success' ? 'var(--bb-success)' : tone === 'danger' ? 'var(--bb-danger)' : 'var(--bb-warning)';
  return <span className="rounded-full border px-2.5 py-1 text-[10px] font-black" style={{ background, color, borderColor: `color-mix(in srgb, ${color} 28%, transparent)` }}>{label}</span>;
}

function creditsPerSecond(model) {
  const value = Number(model?.metadata?.brandbox_credits_per_second || 0);
  return Number.isInteger(value) && value >= 1 ? value : 0;
}

function matrixCreditsLabel(model) {
  const variants = model?.metadata?.brandbox_video_pricing_matrix?.variants;
  if (!Array.isArray(variants) || variants.length === 0) return creditsPerSecond(model) || '—';
  const rates = [...new Set(variants.map((item) => Number(item?.credits_per_second)).filter((value) => Number.isInteger(value) && value > 0))].sort((a, b) => a - b);
  return rates.length ? rates.join(' / ') : '—';
}

function safeAdminAIError(status, fallback) {
  if (status === 401) return 'انتهت جلسة الدخول. يرجى تسجيل الدخول مرة أخرى.';
  if (status === 403) return 'لا تملك الصلاحية المطلوبة لإدارة تكاملات الذكاء الاصطناعي.';
  if (status === 409) return 'تعذر حفظ التعديل: تحقق من تفعيل النموذج وتسعيره وتهيئة المزود قبل إظهاره للمستخدم.';
  if (status === 429) return 'طلبات كثيرة مؤقتًا. حاول مجددًا بعد قليل.';
  return fallback;
}

export default function AdminAIIntegrationsPanel() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [billingDraft, setBillingDraft] = useState({});

  async function accessToken() {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token || '';
  }

  async function load() {
    setLoading(true);
    setError('');
    try {
      const token = await accessToken();
      if (!token) {
        setError('انتهت جلسة الدخول. يرجى تسجيل الدخول مرة أخرى.');
        return;
      }
      const response = await fetch('/api/v1/admin/ai-integrations', { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(safeAdminAIError(response.status, 'تعذر تحميل تكاملات الذكاء الاصطناعي.'));
        return;
      }
      setPayload(result);
      setBillingDraft(result.billing || {});
    } catch {
      setError('تعذر تحميل تكاملات الذكاء الاصطناعي.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function patch(body) {
    setBusy(`${body.action}:${body.modelId || ''}`);
    setError('');
    setMessage('');
    try {
      const token = await accessToken();
      if (!token) {
        setError('انتهت جلسة الدخول. يرجى تسجيل الدخول مرة أخرى.');
        return;
      }
      const response = await fetch('/api/v1/admin/ai-integrations', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(safeAdminAIError(response.status, 'تعذر حفظ التعديل.'));
        return;
      }
      setMessage('تم تحديث إعدادات النموذج وتسجيل العملية في Audit Log.');
      await load();
    } catch {
      setError('تعذر حفظ التعديل.');
    } finally {
      setBusy('');
    }
  }

  async function saveBilling() {
    await patch({
      action: 'update_billing',
      marketUsdLyd: Number(billingDraft.market_usd_lyd),
      openrouterTopupFeePct: Number(billingDraft.openrouter_topup_fee_pct),
      bankTransferFeePct: Number(billingDraft.bank_transfer_fee_pct),
      riskBufferPct: Number(billingDraft.risk_buffer_pct),
      targetGrossMarginPct: Number(billingDraft.target_gross_margin_pct),
      referenceCreditValueLyd: Number(billingDraft.reference_credit_value_lyd),
      minimumOperationCredits: Number(billingDraft.minimum_operation_credits),
      maxBonusPct: Number(billingDraft.max_bonus_pct),
      emergencyFxThresholdLyd: Number(billingDraft.emergency_fx_threshold_lyd),
      hardStopFxThresholdLyd: Number(billingDraft.hard_stop_fx_threshold_lyd),
      openrouterFreeGlobalDailyLimit: Number(billingDraft.openrouter_free_global_daily_limit),
      freeUserDailyLimit: Number(billingDraft.free_user_daily_limit),
      freeModelsEnabled: false,
    });
  }

  async function editPricing(model) {
    if (model.generation_type === 'video') {
      if (model.provider === 'openrouter' && Array.isArray(model?.metadata?.brandbox_video_pricing_matrix?.variants)) {
        setError('هذا الفيديو يستخدم Pricing Matrix حسب الإعدادات. تعديل السعر الثابت معطّل حتى لا يتم تجاوز المصفوفة.');
        return;
      }
      const perSecond = window.prompt('Brand Box credits / second', String(creditsPerSecond(model)));
      if (perSecond === null) return;
      const minimum = window.prompt('Minimum credits floor', String(model.minimum_credits ?? 0));
      if (minimum === null) return;
      await patch({ action: 'update_pricing', modelId: model.model_id, brandboxCreditsPerSecond: Number(perSecond), minimumCredits: Number(minimum) });
      return;
    }
    const input = window.prompt('Input cost / 1M USD', String(model.input_cost_per_million_usd ?? 0));
    if (input === null) return;
    const output = window.prompt('Output cost / 1M USD', String(model.output_cost_per_million_usd ?? 0));
    if (output === null) return;
    const minCredits = window.prompt('Brand Box minimum credits', String(model.minimum_credits ?? 0));
    if (minCredits === null) return;
    await patch({ action: 'update_pricing', modelId: model.model_id, inputCostPerMillionUsd: Number(input), outputCostPerMillionUsd: Number(output), minimumCredits: Number(minCredits) });
  }

  if (loading && !payload) {
    return <div className="bb-panel grid min-h-64 place-items-center rounded-3xl border"><div className="bb-text-secondary flex items-center gap-3 text-sm"><Loader2 className="bb-text-accent animate-spin" size={18}/> جاري تحميل تكاملات AI...</div></div>;
  }

  const providers = payload?.providers || [];
  const models = payload?.models || [];
  const capabilities = payload?.capabilities || {};
  const secretPolicy = payload?.secretPolicy || {};
  const billing = payload?.billing || {};

  return <div className="space-y-5">
    {error && <div className="bb-danger-surface rounded-2xl border px-4 py-3 text-xs">{error}</div>}
    {message && <div className="rounded-2xl border px-4 py-3 text-xs" style={{ background: 'var(--bb-success-soft)', color: 'var(--bb-success)', borderColor: 'color-mix(in srgb, var(--bb-success) 28%, transparent)' }}>{message}</div>}

    <section className="bb-panel rounded-3xl border p-5 sm:p-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div><div className="bb-text-accent text-[10px] font-black tracking-[.2em]">AI INTEGRATIONS</div><h2 className="mt-2 text-xl font-black">مزودو ونماذج الذكاء الاصطناعي</h2><p className="bb-text-tertiary mt-2 max-w-3xl text-xs leading-6">التفعيل والإلغاء متاحان لجميع أدوات Chat / Image / Video / Audio. الإظهار للمستخدم بوابة مستقلة ولا يسمح به قبل وجود سعر Brand Box صالح ومزود مهيأ.</p></div>
        <button onClick={() => void load()} disabled={loading} className="bb-button-secondary flex items-center gap-2 rounded-xl border px-4 py-3 text-xs font-black disabled:opacity-50"><RefreshCw size={15} className={loading ? 'animate-spin' : ''}/> تحديث</button>
      </div>
    </section>

    <div className="grid gap-4 lg:grid-cols-3">
      {providers.map((provider) => <div key={provider.id} className="bb-card rounded-3xl border p-5"><div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2 font-black"><Cpu size={18} className="bb-text-accent"/>{provider.id}</div><StatusBadge label={provider.configured ? 'Configured' : 'Missing secret'} tone={provider.configured ? 'success' : 'danger'} /></div><div className="bb-text-tertiary mt-4 text-xs">{provider.enabledModelCount} مفعّل · {provider.userVisibleModelCount ?? 0} ظاهر للمستخدم · {provider.modelCount} إجمالي</div></div>)}
      <div className="bb-warning-surface rounded-3xl border p-5"><div className="flex items-center gap-2 font-black"><KeyRound size={18}/> سياسة الأسرار</div><div className="mt-4 text-xs leading-6">OpenRouter: {secretPolicy.openrouterConfigured ? 'مهيأ على الخادم' : 'غير مهيأ'}<br/>Runway: {secretPolicy.runwayConfigured ? 'مهيأ على الخادم' : 'غير مهيأ'}<br/>Browser exposure: {secretPolicy.exposedToBrowser ? 'غير آمن' : 'لا يتم كشف الأسرار'}<br/>إدارة الأسرار محجوزة لصلاحية providers.secrets_manage</div></div>
      <div className="bb-card rounded-3xl border p-5"><div className="flex items-center gap-2 font-black"><Database size={18} style={{ color: 'var(--bb-success)' }}/> سياسة التكلفة</div><div className="bb-text-tertiary mt-4 text-xs leading-6">FX: {billing.market_usd_lyd ?? '—'} LYD/USD<br/>Risk buffer: {billing.risk_buffer_pct ?? '—'}%<br/>Target margin: {billing.target_gross_margin_pct ?? '—'}%<br/>مرجع النقطة: {billing.reference_credit_value_lyd ?? '—'} د.ل</div></div>
    </div>

    <section className="bb-panel rounded-3xl border p-5 sm:p-6">
      <div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 shrink-0" size={18} style={{ color: 'var(--bb-success)' }}/><div><h3 className="font-black">المزود المجاني لا يعني استخدامًا مجانيًا للمستخدم</h3><p className="bb-text-tertiary mt-1 text-xs leading-6">إذا أصبحت تكلفة موديل لدى المزود صفرًا، يبقى سعر Brand Box بالنقاط كما هو ويستمر الخصم من المستخدم. فرق التكلفة يتحول إلى هامش للمنصة. لا يوجد مسار Provider-Free يتجاوز نظام النقاط.</p></div></div>
    </section>

    {capabilities.canManagePricing && <section className="bb-panel rounded-3xl border p-5 sm:p-6">
      <div className="mb-4"><h3 className="font-black">التكلفة وحدود الحماية</h3><p className="bb-text-tertiary mt-1 text-xs leading-6">القيم تحفظ على الخادم وتسجل في Audit Log. قيمة النقطة المرجعية لا يمكن خفضها عن أرضية pilot_v1 الحالية 0.11225 د.ل.</p></div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ['market_usd_lyd','سعر الدولار LYD','0.01'],
          ['openrouter_topup_fee_pct','رسوم OpenRouter %','0.01'],
          ['bank_transfer_fee_pct','عمولة المصرف %','0.01'],
          ['risk_buffer_pct','هامش المخاطر %','0.01'],
          ['target_gross_margin_pct','هامش الربح %','0.01'],
          ['reference_credit_value_lyd','قيمة النقطة المرجعية LYD','0.0001'],
          ['minimum_operation_credits','أقل نقاط للعملية','1'],
          ['max_bonus_pct','أقصى Bonus %','0.01'],
          ['emergency_fx_threshold_lyd','حد الصرف التحذيري','0.01'],
          ['hard_stop_fx_threshold_lyd','حد الصرف للإيقاف','0.01'],
          ['openrouter_free_global_daily_limit','حد مزود مجاني داخلي','1'],
          ['free_user_daily_limit','حد حماية لكل مستخدم','1'],
        ].map(([key,label,step]) => <label key={key} className="bb-card block rounded-2xl border p-3"><span className="bb-text-tertiary mb-2 block text-[10px] font-bold">{label}</span><input type="number" step={step} value={billingDraft[key] ?? ''} onChange={(event) => setBillingDraft((current) => ({ ...current, [key]: event.target.value }))} className="bb-input w-full rounded-lg border px-2 py-2 text-sm font-black outline-none"/></label>)}
      </div>
      <button disabled={busy} onClick={() => void saveBilling()} className="bb-button-primary mt-4 rounded-xl px-5 py-2.5 text-xs font-black disabled:opacity-50">حفظ إعدادات التكلفة والحدود</button>
    </section>}

    <section className="bb-panel rounded-3xl border p-4 sm:p-5">
      <div className="mb-4 flex items-center gap-2 font-black"><Sparkles size={18} className="bb-text-accent"/> كتالوج النماذج — الإدارة ترى الكل</div>
      <div className="overflow-x-auto"><table className="w-full min-w-[1320px] text-right text-xs"><thead className="bb-text-tertiary bb-divider border-b"><tr><th className="p-3">النموذج</th><th className="p-3">المزود</th><th className="p-3">النوع</th><th className="p-3">الحالة</th><th className="p-3">Provider Cost</th><th className="p-3">Min Credits</th><th className="p-3">BB / sec</th><th className="p-3">Fallback</th><th className="p-3">الإجراءات</th></tr></thead><tbody className="divide-y divide-[var(--bb-border-subtle)]">{models.map((model) => { const status = modelStatus(model); const canShow = Boolean(model.is_enabled && model.user_pricing_ready); return <tr key={model.model_id}><td className="p-3"><div className="font-black">{model.display_name_ar || model.display_name_en || model.model_id}</div><div className="bb-text-disabled mt-1 max-w-[300px] truncate font-mono text-[10px]">{model.model_id}</div>{model.provider_cost_free && <div className="mt-1 text-[9px] font-black" style={{ color: 'var(--bb-success)' }}>تكلفة المزود 0$ · سعر المستخدم يبقى نقاط Brand Box</div>}</td><td className="p-3">{model.provider}</td><td className="bb-text-warning p-3">{model.generation_type}</td><td className="p-3"><StatusBadge label={status.label} tone={status.tone} /></td><td className="p-3"><div>In {money(model.input_cost_per_million_usd)}</div><div>Out {money(model.output_cost_per_million_usd)}</div><div>Fixed {money(model.fixed_provider_cost_usd)}</div><div>Sec {money(model.provider_cost_per_second_usd)}</div></td><td className="p-3 font-black">{model.minimum_credits}</td><td className="bb-text-accent p-3 font-black">{model.generation_type === 'video' ? matrixCreditsLabel(model) : '—'}</td><td className="bb-text-tertiary p-3 font-mono text-[10px]">{model.fallback_model_id || '—'}</td><td className="p-3"><div className="flex flex-wrap gap-2">{capabilities.canManageModels && <button title={model.is_enabled ? 'تعطيل النموذج وإخفاؤه' : 'تفعيل النموذج داخل الإدارة'} disabled={busy} onClick={() => void patch({ action: 'update_model', modelId: model.model_id, isEnabled: !model.is_enabled })} className="bb-button-secondary inline-flex items-center gap-1 rounded-lg border px-2.5 py-2">{model.is_enabled ? <ToggleRight size={16} style={{ color: 'var(--bb-success)' }}/> : <ToggleLeft size={16}/>} {model.is_enabled ? 'تعطيل' : 'تفعيل'}</button>}{capabilities.canManageModels && <button title={!model.user_pricing_ready ? 'أضف سعر Brand Box أولًا' : !model.is_enabled ? 'فعّل النموذج أولًا' : model.is_visible_to_users ? 'إخفاء عن المستخدمين' : 'إظهار للمستخدمين'} disabled={busy || (!model.is_visible_to_users && !canShow)} onClick={() => void patch({ action: 'update_model', modelId: model.model_id, isVisibleToUsers: !model.is_visible_to_users })} className="bb-button-secondary rounded-lg border px-2.5 py-2 disabled:cursor-not-allowed disabled:opacity-40">{model.is_visible_to_users ? 'إخفاء' : 'إظهار'}</button>}{capabilities.canManageModels && <button disabled={busy} onClick={() => { const fallback = window.prompt('Fallback model ID', model.fallback_model_id || ''); if (fallback !== null) void patch({ action: 'update_model', modelId: model.model_id, fallbackModelId: fallback || null }); }} className="bb-button-secondary rounded-lg border px-2.5 py-2">Fallback</button>}{capabilities.canManagePricing && <button disabled={busy} onClick={() => void editPricing(model)} className="bb-button-secondary rounded-lg border px-2.5 py-2">التكلفة</button>}</div></td></tr>; })}</tbody></table></div>
      {!models.length && <div className="bb-text-tertiary py-12 text-center text-sm">لا توجد نماذج في ai_model_catalog.</div>}
    </section>
  </div>;
}
