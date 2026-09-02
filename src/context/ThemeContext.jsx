'use client';

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore } from 'react';

const ThemeContext = createContext(null);
const THEME_EVENT = 'brandbox-theme-change';
export const THEME_STORAGE_KEY = 'brandbox-theme';

function normalizeTheme(value) {
  return value === 'light' ? 'light' : 'dark';
}

function readTheme() {
  if (typeof document === 'undefined') return 'dark';
  try {
    return normalizeTheme(document.documentElement.dataset.theme || localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    return normalizeTheme(document.documentElement.dataset.theme);
  }
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

function subscribeTheme(callback) {
  if (typeof window === 'undefined') return () => {};
  const handleThemeChange = () => callback();
  const handleStorage = (event) => {
    if (!event.key || event.key === THEME_STORAGE_KEY) callback();
  };
  window.addEventListener(THEME_EVENT, handleThemeChange);
  window.addEventListener('storage', handleStorage);
  return () => {
    window.removeEventListener(THEME_EVENT, handleThemeChange);
    window.removeEventListener('storage', handleStorage);
  };
}

function publishThemeChange() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(THEME_EVENT));
}

export function ThemeProvider({ children }) {
  const theme = useSyncExternalStore(subscribeTheme, readTheme, () => 'dark');

  const setTheme = useCallback((nextTheme) => {
    const normalized = normalizeTheme(nextTheme);
    applyTheme(normalized);
    persistTheme(normalized);
    publishThemeChange();
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(readTheme() === 'light' ? 'dark' : 'light');
  }, [setTheme]);

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
