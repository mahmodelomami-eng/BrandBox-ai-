'use client';

import React, { useState } from 'react';
import WorkspaceLayout from '../../components/navigation/WorkspaceLayout';
import { useAuth } from '../../context/AuthContext';
import { createBrowserSupabaseClient } from '../../lib/supabase/client';
import { MessageSquare, Send, Bot, User } from 'lucide-react';

const CHAT_MODELS = [
  { id: 'openai/gpt-4o-mini', displayName: 'GPT-4o Mini', provider: 'OpenAI', creditCost: 2 },
  { id: 'anthropic/claude-3.5-sonnet', displayName: 'Claude 3.5 Sonnet', provider: 'Anthropic', creditCost: 4 },
  { id: 'meta-llama/llama-3.3-70b-instruct', displayName: 'Llama 3.3 70B', provider: 'Meta', creditCost: 2 },
  { id: 'google/gemini-2.5-flash', displayName: 'Gemini 2.5 Flash', provider: 'Google', creditCost: 1 },
];

export default function ChatAiPage() {
  const { refreshProfile } = useAuth();
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: 'أهلاً بك! أنا المساعد الذكي المخصص لـ Brand Box AI. كيف يمكنني مساعدتك في كتابة نصوصك أو تطوير خطتك التسويقية اليوم؟',
    },
  ]);
  const [input, setInput] = useState('');
  const [selectedModel, setSelectedModel] = useState(CHAT_MODELS[0].id);
  const [isGenerating, setIsGenerating] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (text, type = 'info') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleSend = async () => {
    const prompt = input.trim();
    if (!prompt || isGenerating) return;

    const userMsg = { role: 'user', text: prompt };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
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
          generationType: 'chat',
          modelId: selectedModel,
          prompt,
        }),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.errorMessage || result.error || 'فشل التوليد');
      }

      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: result.content || 'تم التوليد بنجاح.' },
      ]);
      await refreshProfile();
      showToast(`تم التوليد بنجاح! الرصيد المتبقي: ${result.remainingBalance}`, 'success');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'تعذر الاتصال بخدمة الذكاء الاصطناعي';
      setMessages((prev) => [...prev, { role: 'assistant', text: `تعذر إكمال الطلب: ${message}` }]);
      showToast(message, 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <WorkspaceLayout>
      <div className="space-y-4 max-w-4xl mx-auto">
        {toast && (
          <div className={`fixed top-20 left-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl backdrop-blur-md border ${toast.type === 'error' ? 'bg-[#121520] border-red-500/50 text-red-200' : 'bg-[#121520] border-emerald-500/50 text-emerald-200'}`}>
            <span>{toast.text}</span>
          </div>
        )}

        <div className="text-xs text-gray-500">الرئيسية <span className="px-2">/</span> أدوات الذكاء <span className="px-2">/</span> المساعد الذكي</div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-[#FF2E4C]" /> المساعد الذكي (AI Chat Assistant)
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              توليد نصوص إعلانية، خطط محتوى، وتحسين الأفكار التسويقية باللغة العربية.
            </p>
          </div>
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="bg-[#11131a] border border-[#2a2e38] text-white text-xs p-2.5 rounded-xl outline-none cursor-pointer"
          >
            {CHAT_MODELS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.displayName} ({m.creditCost} نقاط) · {m.provider}
              </option>
            ))}
          </select>
        </div>

        {/* Chat Messages Area */}
        <div className="bg-[#11131a] border border-[#2a2e38] rounded-2xl p-5 h-[500px] overflow-y-auto space-y-4">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex items-start gap-3 ${msg.role === 'user' ? 'justify-start' : 'justify-start'}`}
            >
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-[#FF2E4C] text-white' : 'bg-[#1F2438] text-[#FF2E4C]'}`}>
                {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>
              <div className={`max-w-2xl p-4 rounded-2xl text-xs leading-6 ${msg.role === 'user' ? 'bg-[#FF2E4C]/15 border border-[#FF2E4C]/30 text-white font-medium' : 'bg-[#0D0F17] border border-[#1F2438] text-gray-200 whitespace-pre-wrap'}`}>
                {msg.text}
              </div>
            </div>
          ))}
          {isGenerating && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-[#1F2438] text-[#FF2E4C] flex items-center justify-center">
                <Bot className="w-4 h-4" />
              </div>
              <div className="p-3.5 rounded-2xl bg-[#0D0F17] border border-[#1F2438] text-xs text-gray-400 flex items-center gap-2">
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-[#FF2E4C] border-t-transparent" />
                <span>جاري معالجة الرد وتوليد المحتوى...</span>
              </div>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !isGenerating && handleSend()}
            disabled={isGenerating}
            placeholder="اكتب استفسارك أو الفكرة التسويقية التي ترغب في صياغتها..."
            className="flex-1 bg-[#11131a] border border-[#2a2e38] text-white text-xs rounded-xl p-3.5 outline-none focus:border-[#FF2E4C]"
          />
          <button
            onClick={handleSend}
            disabled={isGenerating || !input.trim()}
            className="bg-[#FF2E4C] hover:bg-[#E50914] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs px-6 rounded-xl flex items-center gap-2 transition shadow-lg shadow-[#FF2E4C]/20"
          >
            <Send className="w-4 h-4" />
            <span>إرسال</span>
          </button>
        </div>
      </div>
    </WorkspaceLayout>
  );
}
