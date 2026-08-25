'use client';

import { Coins } from 'lucide-react';

export default function CreditCoin({ value, compact = false, className = '' }) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-xl border border-amber-300/30 bg-[radial-gradient(circle_at_30%_25%,rgba(255,244,173,.24),transparent_35%),linear-gradient(145deg,rgba(245,158,11,.16),rgba(120,53,15,.12))] px-3 py-1.5 font-black text-amber-200 shadow-[inset_0_1px_0_rgba(255,255,255,.1),0_8px_25px_rgba(245,158,11,.08)] ${className}`}
      aria-label={value == null ? 'Credit' : `${value} Credit`}
      title="Credit - رصيد استخدام أدوات Brand Box AI"
    >
      <span className="grid h-6 w-6 place-items-center rounded-full border border-amber-200/60 bg-gradient-to-br from-amber-200 via-amber-400 to-amber-700 text-[#2a1700] shadow-[0_0_16px_rgba(251,191,36,.22)]">
        <Coins size={14} strokeWidth={2.6} />
      </span>
      {value != null && <span className="tabular-nums">{Number(value).toLocaleString('ar-LY')}</span>}
      {!compact && <span className="text-[11px] tracking-wide text-amber-100/85">Credit</span>}
    </span>
  );
}
