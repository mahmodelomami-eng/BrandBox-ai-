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
      <div className="space-y-6 max-w-4xl mx-auto">
        {toast && (
          <div className={`fixed top-20 left-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl backdrop-blur-md border ${toast.type === 'error' ? 'bg-[#121520] border-red-500/50 text-red-200' : 'bg-[#121520] border-emerald-500/50 text-emerald-200'}`}>
            <span>{toast.text}</span>
          </div>
        )}

        <div className="text-xs text-gray-500">الرئيسية <span className="px-2">/</span> مدير الهوية البصرية</div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
              <Palette className="w-5 h-5 text-[#FF2E4C]" /> مدير الهوية البصرية (Brand Kit)
            </h2>
            <p className="text-xs text-gray-400 mt-1">
              حقن ألوان ونبرة وشعار علامتك التجارية تلقائياً في جميع تصاميم الذكاء الاصطناعي.
            </p>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-[#FF2E4C] hover:bg-[#E50914] text-white font-bold text-xs px-6 py-3 rounded-xl transition shadow-lg shadow-[#FF2E4C]/20"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
          <div className="p-6 bg-[#11131a] border border-[#2a2e38] rounded-2xl space-y-4">
            <h3 className="font-bold text-sm text-white">معلومات العلامة</h3>
            <div>
              <label className="block text-gray-400 font-bold mb-1.5">اسم العلامة التجارية:</label>
              <input
                type="text"
                value={brand.brandName}
                onChange={(e) => setBrand({ ...brand, brandName: e.target.value })}
                className="w-full bg-[#0D0F17] border border-[#1F2438] text-white p-3 rounded-xl outline-none focus:border-[#FF2E4C]"
              />
            </div>
            <div>
              <label className="block text-gray-400 font-bold mb-1.5">الشعار اللفظي (Slogan):</label>
              <input
                type="text"
                value={brand.tagline}
                onChange={(e) => setBrand({ ...brand, tagline: e.target.value })}
                className="w-full bg-[#0D0F17] border border-[#1F2438] text-white p-3 rounded-xl outline-none focus:border-[#FF2E4C]"
              />
            </div>
            <div>
              <label className="block text-gray-400 font-bold mb-1.5">وصف النشاط والمنتجات:</label>
              <textarea
                value={brand.description}
                onChange={(e) => setBrand({ ...brand, description: e.target.value })}
                rows={3}
                className="w-full bg-[#0D0F17] border border-[#1F2438] text-white p-3 rounded-xl outline-none focus:border-[#FF2E4C] resize-none"
              />
            </div>
          </div>

          <div className="p-6 bg-[#11131a] border border-[#2a2e38] rounded-2xl space-y-4">
            <h3 className="font-bold text-sm text-white">الألوان ونبرة الصوت</h3>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-gray-400 font-bold mb-1.5 text-[10px]">اللون الرئيسي:</label>
                <div className="flex items-center gap-2 bg-[#0D0F17] border border-[#1F2438] p-2 rounded-xl">
                  <input
                    type="color"
                    value={brand.primaryColor}
                    onChange={(e) => setBrand({ ...brand, primaryColor: e.target.value })}
                    className="w-6 h-6 rounded cursor-pointer bg-transparent border-0"
                  />
                  <span className="font-mono text-[10px] text-gray-300">{brand.primaryColor}</span>
                </div>
              </div>
              <div>
                <label className="block text-gray-400 font-bold mb-1.5 text-[10px]">اللون الثانوي:</label>
                <div className="flex items-center gap-2 bg-[#0D0F17] border border-[#1F2438] p-2 rounded-xl">
                  <input
                    type="color"
                    value={brand.secondaryColor}
                    onChange={(e) => setBrand({ ...brand, secondaryColor: e.target.value })}
                    className="w-6 h-6 rounded cursor-pointer bg-transparent border-0"
                  />
                  <span className="font-mono text-[10px] text-gray-300">{brand.secondaryColor}</span>
                </div>
              </div>
              <div>
                <label className="block text-gray-400 font-bold mb-1.5 text-[10px]">لون التمييز:</label>
                <div className="flex items-center gap-2 bg-[#0D0F17] border border-[#1F2438] p-2 rounded-xl">
                  <input
                    type="color"
                    value={brand.accentColor}
                    onChange={(e) => setBrand({ ...brand, accentColor: e.target.value })}
                    className="w-6 h-6 rounded cursor-pointer bg-transparent border-0"
                  />
                  <span className="font-mono text-[10px] text-gray-300">{brand.accentColor}</span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-gray-400 font-bold mb-1.5">خط العناوين والمنشورات:</label>
              <select
                value={brand.fontFamily}
                onChange={(e) => setBrand({ ...brand, fontFamily: e.target.value })}
                className="w-full bg-[#0D0F17] border border-[#1F2438] text-white p-3 rounded-xl outline-none"
              >
                <option value="Cairo (عربي عصري)">Cairo (عربي عصري)</option>
                <option value="Tajawal (أنيق وبسيط)">Tajawal (أنيق وبسيط)</option>
                <option value="Almarai (رسمي للشركات)">Almarai (رسمي للشركات)</option>
                <option value="Changa (جريء للإعلانات)">Changa (جريء للإعلانات)</option>
              </select>
            </div>

            <div>
              <label className="block text-gray-400 font-bold mb-1.5">نبرة الصوت (Tone of Voice):</label>
              <input
                type="text"
                value={brand.toneOfVoice}
                onChange={(e) => setBrand({ ...brand, toneOfVoice: e.target.value })}
                className="w-full bg-[#0D0F17] border border-[#1F2438] text-white p-3 rounded-xl outline-none focus:border-[#FF2E4C]"
              />
            </div>
          </div>
        </div>
      </div>
    </WorkspaceLayout>
  );
}
