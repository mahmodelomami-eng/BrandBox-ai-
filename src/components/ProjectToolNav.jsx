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
    <div dir="rtl" className="bb-surface-1 bb-border-subtle sticky top-20 z-40 border-b px-4 py-3 shadow-[var(--bb-shadow-sm)] lg:px-6">
      <div className="mx-auto flex max-w-[1700px] items-center gap-2 overflow-x-auto">
        {TOOLS.map(({ id, label, href, icon: Icon }) => {
          const active = activeTool === id;
          return (
            <Link key={id} href={href} className={`flex min-w-[128px] items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-black transition focus-visible:ring-2 ${active ? 'bb-menu-item-active border-[var(--bb-accent-border)]' : 'bb-button-secondary'}`}>
              <Icon size={17} className={active ? 'bb-text-accent' : 'bb-text-tertiary'} /> {label}
            </Link>
          );
        })}
        <Link href="/projects" className="bb-button-secondary mr-auto flex min-w-[110px] items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-black transition focus-visible:ring-2">
          <FolderOpen size={17} /> اختيار الأداة
        </Link>
      </div>
    </div>
  );
}
