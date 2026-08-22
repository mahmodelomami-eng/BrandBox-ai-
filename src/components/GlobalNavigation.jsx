'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createBrowserSupabaseClient } from '../lib/supabase/client';

const NAV_ITEMS = [
  ['الرئيسية', '/'],
  ['الصور AI', '/images-ai'],
  ['الفيديو AI', '/video-ai'],
  ['شات AI', '/chat-ai'],
  ['القوالب', '/templates'],
  ['خطط تسويقية', '/marketing-plans'],
  ['الأسعار', '/pricing'],
  ['المتجر', '/store'],
  ['المطبعة', '/print'],
  ['من نحن', '/about'],
  ['اتصل بنا', '/contact'],
];

const PROJECT_GENERATION_PATHS = new Set(['/images-ai', '/video-ai', '/chat-ai']);

export default function GlobalNavigation() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (mounted) setSignedIn(Boolean(data.session?.user));
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) setSignedIn(Boolean(session?.user));
    });
    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const resolveHref = (href) => signedIn && PROJECT_GENERATION_PATHS.has(href) ? '/projects' : href;

  return (
    <header className="brandbox-global-nav fixed inset-x-0 top-0 z-[100] border-b border-white/5 bg-[#050506]/95 backdrop-blur-xl" dir="rtl">
      <div className="mx-auto flex min-h-20 max-w-[1500px] items-center gap-5 px-4 lg:px-6">
        <Link href="/" aria-label="Brand Box" className="relative h-12 w-40 shrink-0 xl:w-44">
          <Image src="/brandbox-logo.png" alt="Brand Box" fill priority sizes="176px" className="object-contain object-right" unoptimized />
        </Link>

        <nav className="hidden min-w-0 flex-1 items-center justify-center gap-1 xl:flex">
          {NAV_ITEMS.map(([label, href]) => {
            const targetHref = resolveHref(href);
            const active = href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link key={href} href={targetHref} className={`whitespace-nowrap rounded-lg px-2.5 py-2 text-[13px] font-bold transition ${active ? 'bg-[#f31325]/12 text-[#ff3344]' : 'text-gray-300 hover:bg-white/5 hover:text-white'}`}>
                {label}
              </Link>
            );
          })}
        </nav>

        <button type="button" onClick={() => setOpen((value) => !value)} className="mr-auto rounded-xl border border-white/10 p-2.5 text-white xl:hidden" aria-label="القائمة الرئيسية">
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {open && (
        <nav className="max-h-[calc(100vh-5rem)] overflow-y-auto border-t border-white/5 bg-[#090a0d] px-4 py-4 xl:hidden">
          <div className="mx-auto grid max-w-3xl gap-1 sm:grid-cols-2">
            {NAV_ITEMS.map(([label, href]) => (
              <Link key={href} href={resolveHref(href)} onClick={() => setOpen(false)} className="rounded-xl px-4 py-3 text-sm font-bold text-gray-300 transition hover:bg-white/5 hover:text-white">
                {label}
              </Link>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
}
