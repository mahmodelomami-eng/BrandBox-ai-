import './globals.css';
import React from 'react';

export const metadata = {
  title: 'Brand Box AI — منصة الذكاء الاصطناعي الشاملة',
  description: 'منصة الذكاء الاصطناعي المتكاملة لصناع المحتوى والشركات في ليبيا والشرق الأوسط.'
};

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl">
      <body className="bg-[#090A0F] text-gray-100 font-sans antialiased selection:bg-[#FF2E4C] selection:text-white">
        {children}
      </body>
    </html>
  );
}
