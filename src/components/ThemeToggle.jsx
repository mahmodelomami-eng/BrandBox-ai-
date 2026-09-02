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
      className="brandbox-theme-toggle fixed bottom-5 right-5 z-[95] flex min-h-11 items-center gap-2 rounded-2xl border px-3.5 py-2.5 text-xs font-black transition focus-visible:outline-none"
      aria-label={label}
      title={label}
    >
      <span className="bb-accent-soft grid h-7 w-7 place-items-center rounded-lg" aria-hidden="true">
        {isLight ? <Moon size={15} /> : <Sun size={15} />}
      </span>
      <span className="hidden sm:inline">{isLight ? 'الوضع الداكن' : 'الوضع الفاتح'}</span>
    </button>
  );
}
