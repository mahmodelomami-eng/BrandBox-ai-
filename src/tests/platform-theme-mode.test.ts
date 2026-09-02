import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import assert from 'node:assert/strict';

const root = process.cwd();
const layout = readFileSync(join(root, 'src/app/layout.jsx'), 'utf8');
const globals = readFileSync(join(root, 'src/app/globals.css'), 'utf8');
const dropdowns = readFileSync(join(root, 'src/app/dropdown-opaque.css'), 'utf8');
const wrapper = readFileSync(join(root, 'src/components/layout/AppNavigationWrapper.jsx'), 'utf8');
const toggle = readFileSync(join(root, 'src/components/ThemeToggle.jsx'), 'utf8');
const themeContext = readFileSync(join(root, 'src/context/ThemeContext.jsx'), 'utf8');

assert.ok(layout.includes("localStorage.getItem('brandbox-theme')"));
assert.ok(layout.includes('data-theme="dark"'));
assert.ok(layout.includes('suppressHydrationWarning'));
assert.ok(!layout.includes('bg-[#050506] text-gray-100'));

assert.ok(themeContext.includes("THEME_STORAGE_KEY = 'brandbox-theme'"));
assert.ok(themeContext.includes("value === 'light' ? 'light' : 'dark'"));
assert.ok(themeContext.includes('document.documentElement.dataset.theme'));
assert.ok(themeContext.includes('document.documentElement.style.colorScheme'));
assert.ok(themeContext.includes('localStorage.setItem(THEME_STORAGE_KEY'));
assert.ok(themeContext.includes('useSyncExternalStore'));
assert.ok(themeContext.includes('subscribeTheme'));
assert.ok(themeContext.includes("readTheme() === 'light' ? 'dark' : 'light'"));
assert.ok(!themeContext.includes('useEffect('));
assert.ok(!themeContext.includes('setThemeState'));

assert.ok(wrapper.includes('<ThemeProvider>'));
assert.ok(wrapper.includes('<ThemeToggle />'));
assert.ok(wrapper.includes('brandbox-theme-scope'));

assert.ok(toggle.includes('تفعيل الوضع الفاتح'));
assert.ok(toggle.includes('تفعيل الوضع الداكن'));
assert.ok(toggle.includes('brandbox-theme-toggle'));
assert.ok(toggle.includes('<Sun'));
assert.ok(toggle.includes('<Moon'));

assert.ok(globals.includes("html[data-theme='light']"));
assert.ok(globals.includes('--brand-bg: #f5f6f8'));
assert.ok(globals.includes('--brand-surface: #ffffff'));
assert.ok(globals.includes("[class~='bg-[#050506]']"));
assert.ok(globals.includes("[class~='text-white']"));
assert.ok(globals.includes('.brandbox-global-nav'));
assert.ok(dropdowns.includes("html[data-theme='light'] .brandbox-global-nav"));

console.log('Platform light/dark theme regression guard passed.');
