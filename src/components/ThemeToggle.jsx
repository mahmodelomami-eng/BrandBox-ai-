'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function ThemeToggle() {
  const { isLight, toggleTheme } = useTheme();
  const label = isLight ? 'تفعيل الوضع الداكن' : 'تفعيل الوضع الفاتح';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="brandbox-theme-toggle fixed bottom-5 right-5 z-[95] flex min-h-11 items-center gap-2 rounded-2xl border px-3.5 py-2.5 text-xs font-black shadow-xl transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f31325]/70"
      aria-label={label}
      title={label}
    >
      {isLight ? <Moon size={17} aria-hidden="true" /> : <Sun size={17} aria-hidden="true" />}
      <span className="hidden sm:inline">{isLight ? 'الوضع الداكن' : 'الوضع الفاتح'}</span>
    </button>
  );
}
