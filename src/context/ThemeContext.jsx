'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

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

function persistTheme(theme) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {}
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState('dark');

  useEffect(() => {
    const initialTheme = normalizeTheme(document.documentElement.dataset.theme || localStorage.getItem(THEME_STORAGE_KEY));
    setThemeState(initialTheme);
    applyTheme(initialTheme);
  }, []);

  const setTheme = useCallback((nextTheme) => {
    const normalized = normalizeTheme(nextTheme);
    setThemeState(normalized);
    applyTheme(normalized);
    persistTheme(normalized);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((currentTheme) => {
      const nextTheme = currentTheme === 'light' ? 'dark' : 'light';
      applyTheme(nextTheme);
      persistTheme(nextTheme);
      return nextTheme;
    });
  }, []);

  const value = useMemo(() => ({
    theme,
    isLight: theme === 'light',
    setTheme,
    toggleTheme,
  }), [setTheme, theme, toggleTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used inside ThemeProvider');
  return context;
}
