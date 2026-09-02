import './globals.css';
import './dropdown-opaque.css';
import React from 'react';
import { AuthProvider } from '../context/AuthContext';
import AppNavigationWrapper from '../components/layout/AppNavigationWrapper';

export const metadata = {
  title: 'Brand Box AI — منصة الذكاء الاصطناعي الشاملة',
  description: 'منصة الذكاء الاصطناعي المتكاملة لصناع المحتوى والشركات في ليبيا والشرق الأوسط.',
  icons: { icon: '/brandbox-logo.png' },
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
