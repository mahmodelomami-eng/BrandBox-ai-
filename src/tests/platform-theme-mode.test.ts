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
const navigation = readFileSync(join(root, 'src/components/GlobalNavigation.jsx'), 'utf8');
const dashboard = readFileSync(join(root, 'src/components/StableUserDashboard.jsx'), 'utf8');

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
assert.ok(toggle.includes('bb-accent-soft'));
assert.ok(toggle.includes('<Sun'));
assert.ok(toggle.includes('<Moon'));

assert.ok(globals.includes("html[data-theme='light']"));
assert.ok(globals.includes('--bb-canvas: #f3f4f6'));
assert.ok(globals.includes('--bb-surface-2: #ffffff'));
assert.ok(globals.includes('--bb-text-primary: #181b21'));
assert.ok(globals.includes('--bb-border: #d8dde5'));
assert.ok(globals.includes('--bb-accent: #d91426'));
assert.ok(globals.includes('.bb-nav-shell'));
assert.ok(globals.includes('.bb-dashboard-hero'));
assert.ok(globals.includes('.bb-dashboard-metric'));
assert.ok(globals.includes('Temporary legacy bridge for screens not migrated'));

assert.ok(navigation.includes('bb-nav-shell'));
assert.ok(navigation.includes('bb-menu'));
assert.ok(navigation.includes('bb-mobile-nav'));
assert.ok(navigation.includes('bb-button-primary'));
assert.ok(!navigation.includes('bg-[#050506]'));
assert.ok(!navigation.includes('bg-[#0d1016]'));
assert.ok(!navigation.includes('text-white'));
assert.ok(!navigation.includes('ring-offset-[#050506]'));

assert.ok(dashboard.includes('bb-app-canvas'));
assert.ok(dashboard.includes('bb-dashboard-hero'));
assert.ok(dashboard.includes('bb-dashboard-metric'));
assert.ok(dashboard.includes('bb-panel'));
assert.ok(dashboard.includes('bb-media-canvas'));
assert.ok(!dashboard.includes('bg-[#050608]'));
assert.ok(!dashboard.includes('bg-[#0b0d11]'));
assert.ok(!dashboard.includes('bg-[linear-gradient(145deg,#111318,#0b0d11)]'));
assert.ok(!dashboard.includes('text-gray-'));

assert.ok(dropdowns.includes('.bb-menu'));
assert.ok(dropdowns.includes('.bb-mobile-nav'));
assert.ok(!dropdowns.includes('!important'));
assert.ok(!dropdowns.includes('[class*='));

console.log('Semantic platform light/dark theme regression guard passed.');
