'use client';

import { useEffect, useMemo, useState } from 'react';
import { Cpu, Database, KeyRound, Loader2, RefreshCw, ShieldCheck, Sparkles, ToggleLeft, ToggleRight } from 'lucide-react';
import { createBrowserSupabaseClient } from '../lib/supabase/client';

function money(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—';
  return `$${Number(value).toFixed(6)}`;
}

function modelStatus(model) {
  if (!model.is_enabled) return { label: 'معطّل', cls: 'border-red-500/20 bg-red-500/10 text-red-300' };
  if (!model.is_visible_to_users) return { label: 'مخفي', cls: 'border-amber-500/20 bg-amber-500/10 text-amber-300' };
  return { label: 'متاح', cls: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300' };
}

function creditsPerSecond(model) {
  const value = Number(model?.metadata?.brandbox_credits_per_second || 0);
  return Number.isInteger(value) && value >= 1 ? value : 0;
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
    setLoading(true); setError('');
    try {
      const token = await accessToken();
      if (!token) throw new Error('انتهت جلسة الدخول.');
      const response = await fetch('/api/v1/admin/ai-integrations', { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'تعذر تحميل تكاملات الذكاء الاصطناعي.');
      setPayload(result);
      setBillingDraft(result.billing || {});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر تحميل تكاملات الذكاء الاصطناعي.');
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
    setBusy(`${body.action}:${body.modelId || ''}`); setError(''); setMessage('');
    try {
      const token = await accessToken();
      if (!token) throw new Error('انتهت جلسة الدخول.');
      const response = await fetch('/api/v1/admin/ai-integrations', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'تعذر حفظ التعديل.');
      setMessage('تم تحديث إعدادات النموذج وتسجيل العملية في Audit Log.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر حفظ التعديل.');
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
      freeModelsEnabled: Boolean(billingDraft.free_models_enabled),
    });
  }

  async function editPricing(model) {
    if (model.provider === 'runway' && model.generation_type === 'video') {
      const perSecond = window.prompt('Brand Box credits / second', String(creditsPerSecond(model)));
      if (perSecond === null) return;
      const minimum = window.prompt('Minimum credits floor', String(model.minimum_credits ?? 0));
      if (minimum === null) return;
      await patch({
        action: 'update_pricing',
        modelId: model.model_id,
        brandboxCreditsPerSecond: Number(perSecond),
        minimumCredits: Number(minimum),
      });
      return;
    }
    const input = window.prompt('Input cost / 1M USD', String(model.input_cost_per_million_usd ?? 0));
    if (input === null) return;
    const output = window.prompt('Output cost / 1M USD', String(model.output_cost_per_million_usd ?? 0));
    if (output === null) return;
    const minCredits = window.prompt('Minimum credits', String(model.minimum_credits ?? 0));
    if (minCredits === null) return;
    await patch({ action: 'update_pricing', modelId: model.model_id, inputCostPerMillionUsd: Number(input), outputCostPerMillionUsd: Number(output), minimumCredits: Number(minCredits) });
  }

  if (loading && !payload) {
    return <div className="grid min-h-64 place-items-center rounded-3xl border border-white/10 bg-[#0d1016]"><div className="flex items-center gap-3 text-sm text-gray-500"><Loader2 className="animate-spin text-[#ff3344]" size={18}/> جاري تحميل تكاملات AI...</div></div>;
  }

  const providers = payload?.providers || [];
  const models = payload?.models || [];
  const capabilities = payload?.capabilities || {};
  const secretPolicy = payload?.secretPolicy || {};
  const billing = payload?.billing || {};

  return <div className="space-y-5">
    {error && <div className="rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-xs text-red-200">{error}</div>}
    {message && <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-200">{message}</div>}

    <section className="rounded-3xl border border-white/10 bg-[#0d1016] p-5 sm:p-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div><div className="text-[10px] font-black tracking-[.2em] text-[#ff6674]">AI INTEGRATIONS</div><h2 className="mt-2 text-xl font-black">مزودو ونماذج الذكاء الاصطناعي</h2><p className="mt-2 max-w-3xl text-xs leading-6 text-gray-500">تحكم تشغيلي فعلي في النماذج والتوفر والتكلفة. مفاتيح API لا تُرسل إلى المتصفح ولا تُعرض في هذه الشاشة.</p></div>
        <button onClick={() => void load()} disabled={loading} className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#10131a] px-4 py-3 text-xs font-black"><RefreshCw size={15} className={loading ? 'animate-spin' : ''}/> تحديث</button>
      </div>
    </section>

    <div className="grid gap-4 lg:grid-cols-3">
      {providers.map((provider) => <div key={provider.id} className="rounded-3xl border border-white/10 bg-[#0d1016] p-5"><div className="flex items-center justify-between"><div className="flex items-center gap-2 font-black"><Cpu size={18} className="text-[#ff3344]"/>{provider.id}</div><span className={`rounded-full border px-2.5 py-1 text-[10px] font-black ${provider.configured ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300' : 'border-red-500/20 bg-red-500/10 text-red-300'}`}>{provider.configured ? 'Configured' : 'Missing secret'}</span></div><div className="mt-4 text-xs text-gray-500">{provider.enabledModelCount} نموذج مفعّل من أصل {provider.modelCount}</div></div>)}
      <div className="rounded-3xl border border-amber-500/15 bg-amber-500/5 p-5"><div className="flex items-center gap-2 font-black text-amber-200"><KeyRound size={18}/> سياسة الأسرار</div><div className="mt-4 text-xs leading-6 text-amber-100/70">OpenRouter: {secretPolicy.openrouterConfigured ? 'مهيأ على الخادم' : 'غير مهيأ'}<br/>Runway: {secretPolicy.runwayConfigured ? 'مهيأ على الخادم' : 'غير مهيأ'}<br/>Browser exposure: {secretPolicy.exposedToBrowser ? 'غير آمن' : 'لا يتم كشف الأسرار'}</div></div>
      <div className="rounded-3xl border border-white/10 bg-[#0d1016] p-5"><div className="flex items-center gap-2 font-black"><Database size={18} className="text-emerald-300"/> سياسة التكلفة</div><div className="mt-4 text-xs leading-6 text-gray-500">FX: {billing.market_usd_lyd ?? '—'} LYD/USD<br/>Risk buffer: {billing.risk_buffer_pct ?? '—'}%<br/>Target margin: {billing.target_gross_margin_pct ?? '—'}%</div></div>
    </div>

    {capabilities.canManagePricing && <section className="rounded-3xl border border-white/10 bg-[#0d1016] p-5 sm:p-6">
      <div className="mb-4"><h3 className="font-black">التكلفة وحدود Free AI</h3><p className="mt-1 text-xs leading-6 text-gray-500">تعديل سعر الصرف والهوامش وحدود الاستخدام المجاني من billing_settings. القيم تحفظ على الخادم وتسجل في Audit Log.</p></div>
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
          ['openrouter_free_global_daily_limit','Free AI إجمالي يومي','1'],
          ['free_user_daily_limit','Free AI لكل مستخدم','1'],
        ].map(([key,label,step]) => <label key={key} className="block rounded-2xl border border-white/10 bg-[#10131a] p-3"><span className="mb-2 block text-[10px] font-bold text-gray-500">{label}</span><input type="number" step={step} value={billingDraft[key] ?? ''} onChange={(event) => setBillingDraft((current) => ({ ...current, [key]: event.target.value }))} className="w-full bg-transparent text-sm font-black outline-none"/></label>)}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button onClick={() => setBillingDraft((current) => ({ ...current, free_models_enabled: !current.free_models_enabled }))} className={`rounded-xl border px-4 py-2.5 text-xs font-black ${billingDraft.free_models_enabled ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border-white/10 bg-white/5 text-gray-400'}`}>{billingDraft.free_models_enabled ? 'Free Models مفعّلة' : 'Free Models متوقفة'}</button>
        <button disabled={busy} onClick={() => void saveBilling()} className="rounded-xl bg-[#f31325] px-5 py-2.5 text-xs font-black disabled:opacity-50">حفظ إعدادات التكلفة والحدود</button>
      </div>
    </section>}

    <section className="rounded-3xl border border-white/10 bg-[#0d1016] p-4 sm:p-5">
      <div className="mb-4 flex items-center gap-2 font-black"><Sparkles size={18} className="text-[#ff3344]"/> كتالوج النماذج</div>
      <div className="overflow-x-auto"><table className="w-full min-w-[1280px] text-right text-xs"><thead className="border-b border-white/10 text-gray-500"><tr><th className="p-3">النموذج</th><th className="p-3">المزود</th><th className="p-3">النوع</th><th className="p-3">الحالة</th><th className="p-3">Input / 1M</th><th className="p-3">Output / 1M</th><th className="p-3">Fixed</th><th className="p-3">Min Credits</th><th className="p-3">BB / sec</th><th className="p-3">Fallback</th><th className="p-3">الإجراءات</th></tr></thead><tbody className="divide-y divide-white/[.06]">{models.map((model) => { const status = modelStatus(model); return <tr key={model.model_id}><td className="p-3"><div className="font-black">{model.display_name_ar || model.display_name_en || model.model_id}</div><div className="mt-1 max-w-[280px] truncate font-mono text-[10px] text-gray-600">{model.model_id}</div></td><td className="p-3">{model.provider}</td><td className="p-3 text-amber-300">{model.generation_type}</td><td className="p-3"><span className={`rounded-full border px-2.5 py-1 text-[10px] font-black ${status.cls}`}>{status.label}</span></td><td className="p-3">{money(model.input_cost_per_million_usd)}</td><td className="p-3">{money(model.output_cost_per_million_usd)}</td><td className="p-3">{money(model.fixed_provider_cost_usd)}</td><td className="p-3 font-black">{model.minimum_credits}</td><td className="p-3 font-black text-[#ff6674]">{model.provider === 'runway' && model.generation_type === 'video' ? creditsPerSecond(model) || '—' : '—'}</td><td className="p-3 font-mono text-[10px] text-gray-500">{model.fallback_model_id || '—'}</td><td className="p-3"><div className="flex flex-wrap gap-2">{capabilities.canManageModels && <button disabled={busy} onClick={() => void patch({ action: 'update_model', modelId: model.model_id, isEnabled: !model.is_enabled })} className="rounded-lg border border-white/10 px-2.5 py-2 text-gray-300">{model.is_enabled ? <ToggleRight size={16} className="text-emerald-300"/> : <ToggleLeft size={16}/>}</button>}{capabilities.canManageModels && <button disabled={busy} onClick={() => void patch({ action: 'update_model', modelId: model.model_id, isVisibleToUsers: !model.is_visible_to_users })} className="rounded-lg border border-cyan-500/20 px-2.5 py-2 text-cyan-300">{model.is_visible_to_users ? 'إخفاء' : 'إظهار'}</button>}{capabilities.canManageModels && <button disabled={busy} onClick={() => { const fallback = window.prompt('Fallback model ID', model.fallback_model_id || ''); if (fallback !== null) void patch({ action: 'update_model', modelId: model.model_id, fallbackModelId: fallback || null }); }} className="rounded-lg border border-amber-500/20 px-2.5 py-2 text-amber-300">Fallback</button>}{capabilities.canManagePricing && <button disabled={busy} onClick={() => void editPricing(model)} className="rounded-lg border border-emerald-500/20 px-2.5 py-2 text-emerald-300">التكلفة</button>}</div></td></tr>; })}</tbody></table></div>
      {!models.length && <div className="py-12 text-center text-sm text-gray-500">لا توجد نماذج في ai_model_catalog.</div>}
    </section>

    <section className="rounded-3xl border border-emerald-500/15 bg-emerald-500/5 p-5"><div className="flex items-center gap-2 font-black text-emerald-200"><ShieldCheck size={18}/> حدود الصلاحيات</div><p className="mt-3 text-xs leading-6 text-emerald-100/70">عرض النماذج يحتاج providers.read أو models.read. تعديل التوفر يحتاج models.manage. تعديل الأسعار يحتاج models.pricing_manage. إدارة الأسرار محجوزة لصلاحية providers.secrets_manage ولا تعرض أي قيمة سرية في الواجهة.</p></section>
  </div>;
}
