'use client';

import Link from 'next/link';
import { FolderOpen, Image as ImageIcon, MessageSquare, Mic2, Video } from 'lucide-react';

const TOOLS = [
  { id: 'images', label: 'الصور AI', href: '/projects/images', icon: ImageIcon },
  { id: 'video', label: 'الفيديو AI', href: '/projects/video', icon: Video },
  { id: 'chat', label: 'الشات AI', href: '/projects/chat', icon: MessageSquare },
  { id: 'audio', label: 'الصوت AI', href: '/projects/audio', icon: Mic2 },
];

export default function ProjectToolNav({ activeTool }) {
  return (
    <div dir="rtl" className="sticky top-20 z-40 border-b border-white/[.06] bg-[#07080b] px-4 py-3 shadow-[0_12px_45px_rgba(0,0,0,.35)] lg:px-6">
      <div className="mx-auto flex max-w-[1700px] items-center gap-2 overflow-x-auto">
        {TOOLS.map(({ id, label, href, icon: Icon }) => {
          const active = activeTool === id;
          return (
            <Link key={id} href={href} className={`flex min-w-[128px] items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-black transition ${active ? 'border-[#f31325]/60 bg-[#f31325]/12 text-white' : 'border-white/[.08] bg-[#101217] text-gray-400 hover:border-[#f31325]/35 hover:text-white'}`}>
              <Icon size={17} className={active ? 'text-[#ff3344]' : 'text-gray-500'} /> {label}
            </Link>
          );
        })}
        <Link href="/projects" className="mr-auto flex min-w-[110px] items-center justify-center gap-2 rounded-xl border border-white/[.08] bg-[#101217] px-3 py-2.5 text-xs font-black text-gray-400 transition hover:border-[#f31325]/35 hover:text-white">
          <FolderOpen size={17} /> اختيار الأداة
        </Link>
      </div>
    </div>
  );
}
