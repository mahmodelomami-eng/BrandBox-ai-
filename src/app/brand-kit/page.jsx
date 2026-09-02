'use client';

import React, { useState, useEffect } from 'react';
import WorkspaceLayout from '../../components/navigation/WorkspaceLayout';
import { Palette, Save } from 'lucide-react';

const DEFAULT_BRAND = {
  brandName: 'القهوة الإثيوبية الفاخرة',
  tagline: 'المذاق الأصيل من أعالي الهضاب',
  description: 'علامة تجارية متخصصة في توفير القهوة المختصة العالية الجودة لعشاق المذاق الرفيع.',
  primaryColor: '#8B4513',
  secondaryColor: '#D2691E',
  accentColor: '#FF2E4C',
  fontFamily: 'Cairo (عربي عصري)',
  toneOfVoice: 'احترافي، دافئ، وحماسي',
};

export default function BrandKitPage() {
  const [brand, setBrand] = useState(DEFAULT_BRAND);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (text, type = 'info') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const saved = localStorage.getItem('brandbox_brand_kit');
        if (saved) setBrand(JSON.parse(saved));
      } catch {
        // Keep the default brand kit when local storage is unavailable or invalid.
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  const handleSave = () => {
    setSaving(true);
    try {
      localStorage.setItem('brandbox_brand_kit', JSON.stringify(brand));
      showToast('تم حفظ إعدادات الهوية البصرية بنجاح!', 'success');
    } catch {
      showToast('تعذر حفظ الهوية', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <WorkspaceLayout>
      <div className="mx-auto max-w-4xl space-y-6">
        {toast && (
          <div className="bb-surface-elevated fixed left-6 top-20 z-50 flex items-center gap-3 rounded-xl border px-4 py-3 shadow-[var(--bb-shadow-lg)]" style={{ borderColor: toast.type === 'error' ? 'color-mix(in srgb, var(--bb-danger) 45%, transparent)' : 'color-mix(in srgb, var(--bb-success) 45%, transparent)', color: toast.type === 'error' ? 'var(--bb-danger)' : 'var(--bb-success)' }}>
            <span>{toast.text}</span>
          </div>
        )}

        <div className="bb-text-tertiary text-xs">الرئيسية <span className="px-2">/</span> مدير الهوية البصرية</div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="bb-text-primary flex items-center gap-2 text-xl font-extrabold">
              <Palette className="bb-text-accent h-5 w-5" /> مدير الهوية البصرية (Brand Kit)
            </h2>
            <p className="bb-text-secondary mt-1 text-xs">
              حقن ألوان ونبرة وشعار علامتك التجارية تلقائياً في جميع تصاميم الذكاء الاصطناعي.
            </p>
          </div>
          <button onClick={handleSave} disabled={saving} className="bb-button-primary flex items-center gap-2 rounded-xl px-6 py-3 text-xs font-bold shadow-[var(--bb-shadow-sm)] disabled:opacity-50">
            <Save className="h-4 w-4" />
            <span>{saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 gap-6 text-xs md:grid-cols-2">
          <div className="bb-panel space-y-4 rounded-2xl border p-6">
            <h3 className="bb-text-primary text-sm font-bold">معلومات العلامة</h3>
            <BrandInput label="اسم العلامة التجارية:" value={brand.brandName} onChange={(value) => setBrand({ ...brand, brandName: value })} />
            <BrandInput label="الشعار اللفظي (Slogan):" value={brand.tagline} onChange={(value) => setBrand({ ...brand, tagline: value })} />
            <div>
              <label className="bb-text-secondary mb-1.5 block font-bold">وصف النشاط والمنتجات:</label>
              <textarea value={brand.description} onChange={(e) => setBrand({ ...brand, description: e.target.value })} rows={3} className="bb-input w-full resize-none rounded-xl border p-3 outline-none" />
            </div>
          </div>

          <div className="bb-panel space-y-4 rounded-2xl border p-6">
            <h3 className="bb-text-primary text-sm font-bold">الألوان ونبرة الصوت</h3>
            <div className="grid grid-cols-3 gap-3">
              <ColorField label="اللون الرئيسي:" value={brand.primaryColor} onChange={(value) => setBrand({ ...brand, primaryColor: value })} />
              <ColorField label="اللون الثانوي:" value={brand.secondaryColor} onChange={(value) => setBrand({ ...brand, secondaryColor: value })} />
              <ColorField label="لون التمييز:" value={brand.accentColor} onChange={(value) => setBrand({ ...brand, accentColor: value })} />
            </div>

            <div>
              <label className="bb-text-secondary mb-1.5 block font-bold">خط العناوين والمنشورات:</label>
              <select value={brand.fontFamily} onChange={(e) => setBrand({ ...brand, fontFamily: e.target.value })} className="bb-input w-full rounded-xl border p-3 outline-none">
                <option value="Cairo (عربي عصري)">Cairo (عربي عصري)</option>
                <option value="Tajawal (أنيق وبسيط)">Tajawal (أنيق وبسيط)</option>
                <option value="Almarai (رسمي للشركات)">Almarai (رسمي للشركات)</option>
                <option value="Changa (جريء للإعلانات)">Changa (جريء للإعلانات)</option>
              </select>
            </div>

            <BrandInput label="نبرة الصوت (Tone of Voice):" value={brand.toneOfVoice} onChange={(value) => setBrand({ ...brand, toneOfVoice: value })} />
          </div>
        </div>
      </div>
    </WorkspaceLayout>
  );
}

function BrandInput({ label, value, onChange }) {
  return <div><label className="bb-text-secondary mb-1.5 block font-bold">{label}</label><input type="text" value={value} onChange={(event) => onChange(event.target.value)} className="bb-input w-full rounded-xl border p-3 outline-none" /></div>;
}

function ColorField({ label, value, onChange }) {
  return <div><label className="bb-text-secondary mb-1.5 block text-[10px] font-bold">{label}</label><div className="bb-card flex items-center gap-2 rounded-xl border p-2"><input type="color" value={value} onChange={(event) => onChange(event.target.value)} className="h-6 w-6 cursor-pointer rounded border-0 bg-transparent" /><span className="bb-text-secondary font-mono text-[10px]">{value}</span></div></div>;
}
