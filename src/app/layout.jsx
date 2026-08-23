import './globals.css';
import './dropdown-opaque.css';
import React from 'react';
import GlobalNavigation from '../components/GlobalNavigation';

export const metadata = {
  title: 'Brand Box AI — منصة الذكاء الاصطناعي الشاملة',
  description: 'منصة الذكاء الاصطناعي المتكاملة لصناع المحتوى والشركات في ليبيا والشرق الأوسط.',
  icons: { icon: '/brandbox-logo.png' }
};

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl">
      <body className="bg-[#050506] text-gray-100 font-sans antialiased selection:bg-[#F31325] selection:text-white">
        <GlobalNavigation />
        <div className="pt-20">
          {children}
        </div>
      </body>
    </html>
  );
}
