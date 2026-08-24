'use client';

import React, { useState } from 'react';
import WorkspaceLayout from '../../components/navigation/WorkspaceLayout';
import { useAuth } from '../../context/AuthContext';
import { createBrowserSupabaseClient } from '../../lib/supabase/client';
import {
  ImageIcon,
  Sparkles,
} from 'lucide-react';

const IMAGE_MODELS = [
  { id: 'openai/gpt-image-2', displayName: 'GPT Image 2', provider: 'OpenAI', creditCost: 6 },
  { id: 'bytedance-seed/seedream-5-0-lite', displayName: 'Seedream 5.0 Lite', provider: 'ByteDance', creditCost: 4 },
  { id: 'google/gemini-3.1-flash-lite-image', displayName: 'Nano Banana 2 Lite', provider: 'Google', creditCost: 4 },
];

const ASPECT_RATIOS = ['Auto', '4:1', '3:1', '21:9', '2:1', '17:9', '16:9', '3:2', '4:3', '5:4', '1:1', '4:5', '3:4', '2:3', '9:16'];

export default function ImagesAiPage() {
  const { refreshProfile } = useAuth();
  const [prompt, setPrompt] = useState('');
  const [selectedModel, setSelectedModel] = useState(IMAGE_MODELS[0].id);
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [count, setCount] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [results, setResults] = useState([]);
  const [toast, setToast] = useState(null);

  const showToast = (text, type = 'info') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      return showToast('يرجى كتابة وصف الصورة أولاً', 'error');
    }
    setIsGenerating(true);
    try {
      const supabase = createBrowserSupabaseClient();
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      if (sessionError || !accessToken) throw new Error('يرجى تسجيل الدخول مرة أخرى');

      const response = await fetch('/api/v1/generations', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          generationType: 'image',
          modelId: selectedModel,
          prompt: prompt.trim(),
          settings: {
            aspectRatio: aspectRatio === 'Auto' ? 'auto' : aspectRatio,
            count,
            resolution: '1K',
          },
        }),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.errorMessage || result.error || 'فشل التوليد');
      }

      const urls = Array.isArray(result.resultUrls) ? result.resultUrls : result.resultUrl ? [result.resultUrl] : [];
      setResults((prev) => [
        ...urls.map((url) => ({ url, prompt: prompt.trim(), date: new Date().toLocaleTimeString('ar-LY') })),
        ...prev,
      ]);
      await refreshProfile();
      showToast(`تم التوليد بنجاح! الرصيد المتبقي: ${result.remainingBalance}`, 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'تعذر إكمال التوليد', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const selectedModelObj = IMAGE_MODELS.find((m) => m.id === selectedModel) || IMAGE_MODELS[0];

  return (
    <WorkspaceLayout>
      <div className="space-y-6 max-w-5xl mx-auto">
        {toast && (
          <div className={`fixed top-20 left-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl backdrop-blur-md border ${toast.type === 'error' ? 'bg-[#121520] border-red-500/50 text-red-200' : 'bg-[#121520] border-emerald-500/50 text-emerald-200'}`}>
            <span>{toast.text}</span>
          </div>
        )}

        <div className="text-xs text-gray-500">الرئيسية <span className="px-2">/</span> أدوات الذكاء <span className="px-2">/</span> مولد الصور</div>

        <div>
          <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-[#FF2E4C]" /> مولد الصور فائق الدقة (AI Image Generator)
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            توليد صور وبوسترات احترافية عبر نماذج الذكاء الاصطناعي العالمية الأكثر تطورًا.
          </p>
        </div>

        {/* Generator Controls Card */}
        <div className="p-6 bg-[#11131a] border border-[#2a2e38] rounded-2xl space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-300 mb-2">وصف الصورة المطلوبة:</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="صف الصورة المراد توليدها بدقة، الأسلوب البصري، الألوان، الإضاءة..."
              rows={3}
              className="w-full bg-[#0D0F17] border border-[#1F2438] text-white text-xs rounded-xl p-3.5 outline-none focus:border-[#FF2E4C] resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="block text-gray-400 font-bold mb-1.5">النموذج:</label>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="w-full bg-[#0D0F17] border border-[#1F2438] text-white p-2.5 rounded-xl outline-none"
              >
                {IMAGE_MODELS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.displayName} ({m.creditCost} نقاط)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-gray-400 font-bold mb-1.5">الأبعاد والمقاس:</label>
              <select
                value={aspectRatio}
                onChange={(e) => setAspectRatio(e.target.value)}
                className="w-full bg-[#0D0F17] border border-[#1F2438] text-white p-2.5 rounded-xl outline-none"
              >
                {ASPECT_RATIOS.map((ratio) => (
                  <option key={ratio} value={ratio}>{ratio}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-gray-400 font-bold mb-1.5">عدد الصور:</label>
              <div className="flex gap-2">
                {[1, 2, 4].map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setCount(v)}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition ${
                      count === v ? 'bg-white text-black' : 'bg-[#0D0F17] border border-[#1F2438] text-gray-400 hover:text-white'
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between border-t border-[#1F2438]">
            <div className="text-xs text-gray-400">
              التكلفة المقدرة: <span className="font-bold text-[#FF2E4C]">{selectedModelObj.creditCost * count} نقاط</span>
            </div>
            <button
              onClick={handleGenerate}
              disabled={isGenerating || !prompt.trim()}
              className="bg-[#FF2E4C] hover:bg-[#E50914] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs px-6 py-3 rounded-xl flex items-center gap-2 transition shadow-lg shadow-[#FF2E4C]/20"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isGenerating ? 'جاري التوليد...' : `توليد ${count} ${count === 1 ? 'صورة' : 'صور'}`}</span>
            </button>
          </div>
        </div>

        {/* Results Gallery */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-white">النتائج المنشأة حديثاً</h3>
          {results.length === 0 ? (
            <div className="p-12 text-center rounded-2xl border border-dashed border-[#2a2e38] bg-[#11131a] text-xs text-gray-500">
              لم يتم إنشاء صور في هذه الجلسة بعد. اكتب الوصف واضغط على زر التوليد أعلاه.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {results.map((res, idx) => (
                <div key={idx} className="group relative rounded-2xl overflow-hidden border border-[#1F2438] bg-[#11131a]">
                  <img src={res.url} alt={res.prompt} className="w-full h-auto object-cover" />
                  <div className="p-3 bg-[#0D0F17] border-t border-[#1F2438]">
                    <p className="text-xs text-gray-300 line-clamp-1">{res.prompt}</p>
                    <span className="text-[10px] text-gray-500">{res.date}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </WorkspaceLayout>
  );
}
