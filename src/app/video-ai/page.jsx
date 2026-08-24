'use client';

import React from 'react';
import WorkspaceLayout from '../../components/navigation/WorkspaceLayout';
import { Video, AlertTriangle } from 'lucide-react';

export default function VideoAiPage() {
  return (
    <WorkspaceLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="text-xs text-gray-500">الرئيسية <span className="px-2">/</span> أدوات الذكاء <span className="px-2">/</span> مولد الفيديو</div>

        <div>
          <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
            <Video className="w-5 h-5 text-[#FF2E4C]" /> مولد الفيديو الذكي (AI Video Generator)
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            بنية معالجة مقاطع الفيديو المتزامنة وغير المتزامنة (Runway Gen-3 Alpha).
          </p>
        </div>

        {/* Staging Notice */}
        <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-between text-xs">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <div className="font-bold text-amber-300">
                حالة النموذج: Runway Gen-3 Alpha (مرحلة التجهيز Staging)
              </div>
              <p className="text-gray-400 mt-0.5">
                المزود قيد الإعداد التقني وسيتاح للتوليد المباشر في التحديث القادم.
              </p>
            </div>
          </div>
          <span className="px-3 py-1 bg-amber-500/20 text-amber-400 font-bold rounded-lg border border-amber-500/30 shrink-0">
            قريباً
          </span>
        </div>

        <div className="p-6 bg-[#11131a] border border-[#2a2e38] rounded-2xl space-y-4 opacity-75">
          <div>
            <label className="block text-xs font-bold text-gray-400 mb-2">وصف مشهد الفيديو:</label>
            <textarea
              disabled
              placeholder="صف المشهد، حركة الكاميرا، والبيئة المحيطة لمقطع الفيديو..."
              className="w-full bg-[#0D0F17] border border-[#1F2438] text-gray-500 text-xs rounded-xl p-3.5 outline-none cursor-not-allowed resize-none"
              rows={4}
            />
          </div>

          <button
            disabled
            className="bg-gray-800 text-gray-500 font-bold text-xs px-6 py-3 rounded-xl cursor-not-allowed"
          >
            توليد الفيديو (15 نقطة - قريباً)
          </button>
        </div>
      </div>
    </WorkspaceLayout>
  );
}
