'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const ThemeContext = createContext(null);
export const THEME_STORAGE_KEY = 'brandbox-theme';

function normalizeTheme(value) {
  return value === 'light' ? 'light' : 'dark';
}

function applyTheme(theme) {
  if (typeof document === 'undefined') return;
  const normalized = normalizeTheme(theme);
  document.documentElement.dataset.theme = normalized;
  document.documentElement.style.colorScheme = normalized;
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState('dark');

  useEffect(() => {
    const initialTheme = normalizeTheme(document.documentElement.dataset.theme || localStorage.getItem(THEME_STORAGE_KEY));
    setThemeState(initialTheme);
    applyTheme(initialTheme);
  }, []);

  const setTheme = (nextTheme) => {
    const normalized = normalizeTheme(nextTheme);
    setThemeState(normalized);
    applyTheme(normalized);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, normalized);
    } catch {}
  };

  const value = useMemo(() => ({
    theme,
    isLight: theme === 'light',
    setTheme,
    toggleTheme: () => setTheme(theme === 'light' ? 'dark' : 'light'),
  }), [theme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used inside ThemeProvider');
  return context;
}
