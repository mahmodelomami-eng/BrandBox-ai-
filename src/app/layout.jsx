import './globals.css';
import './dropdown-opaque.css';
import React from 'react';
import { AuthProvider } from '../context/AuthContext';
import AppNavigationWrapper from '../components/layout/AppNavigationWrapper';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.brandbox-ai.com';

export const metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: 'Brand Box AI',
  title: 'Brand Box AI — منصة الذكاء الاصطناعي الشاملة',
  description: 'منصة الذكاء الاصطناعي المتكاملة لصناع المحتوى والشركات في ليبيا والشرق الأوسط.',
  icons: { icon: '/brandbox-logo.png' },
  openGraph: {
    type: 'website',
    locale: 'ar_LY',
    siteName: 'Brand Box AI',
    title: 'Brand Box AI — منصة الذكاء الاصطناعي الشاملة',
    description: 'منصة الذكاء الاصطناعي المتكاملة لصناع المحتوى والشركات في ليبيا والشرق الأوسط.',
  },
};

const themeInitScript = `
  (() => {
    try {
      const saved = localStorage.getItem('brandbox-theme');
      const theme = saved === 'light' ? 'light' : 'dark';
      document.documentElement.dataset.theme = theme;
      document.documentElement.style.colorScheme = theme;
    } catch {
      document.documentElement.dataset.theme = 'dark';
      document.documentElement.style.colorScheme = 'dark';
    }
  })();
`;

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="font-sans antialiased selection:bg-[#F31325] selection:text-white">
        <AuthProvider>
          <AppNavigationWrapper>
            {children}
          </AppNavigationWrapper>
        </AuthProvider>
      </body>
    </html>
  );
}
