'use client';

import Link from 'next/link';
import { createPortal } from 'react-dom';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Image as ImageIcon, MessageSquare, Mic2, Video } from 'lucide-react';

const TOOLS = [
  { id: 'images', label: 'الصور AI', description: 'مشاريع توليد وتحرير الصور', href: '/projects/images', icon: ImageIcon },
  { id: 'video', label: 'الفيديو AI', description: 'مشاريع الفيديو والمشاهد', href: '/projects/video', icon: Video },
  { id: 'chat', label: 'الشات AI', description: 'المحادثات والكتابة داخل المشاريع', href: '/projects/chat', icon: MessageSquare },
  { id: 'audio', label: 'الصوت AI', description: 'مشاريع الصوت والتعليق الصوتي', href: '/projects/audio', icon: Mic2 },
];

export default function UserDashboardToolChooserEnhancer() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const view = searchParams.get('view') || '';
  const [host, setHost] = useState(null);

  useEffect(() => {
    let active = true;

    const enhance = () => {
      const root = document.querySelector('.legacy-workspace-shell');
      if (!root) return;

      const sidebar = root.querySelector('aside');
      if (sidebar) {
        const projectButton = Array.from(sidebar.querySelectorAll('button')).find((button) =>
          button.dataset.brandboxToolChooser === '1' || /المشاريع\s*\(Projects\)/.test(button.textContent || ''),
        );
        if (projectButton) {
          projectButton.dataset.brandboxToolChooser = '1';
          const spans = projectButton.querySelectorAll(':scope > span');
          if (spans[0]) spans[0].style.display = 'none';
          if (spans[1]) spans[1].textContent = 'اختيار الأداة';
        }
      }

      if (view === 'dashboard') {
        Array.from(root.querySelectorAll('main button')).forEach((button) => {
          if ((button.textContent || '').trim() === 'مشروع جديد') button.style.display = 'none';
        });

        const heading = Array.from(root.querySelectorAll('h1,h2,h3')).find((node) =>
          (node.textContent || '').includes('مرحباً بك في Brand Box AI'),
        );
        if (heading) {
          let dashboard = heading.parentElement;
          while (dashboard && dashboard !== root && !dashboard.classList.contains('space-y-5')) dashboard = dashboard.parentElement;
          if (dashboard && dashboard !== root) {
            let target = dashboard.querySelector('#brandbox-dashboard-tool-chooser');
            if (!target) {
              target = document.createElement('div');
              target.id = 'brandbox-dashboard-tool-chooser';
              const intro = dashboard.children[1] || dashboard.firstElementChild;
              if (intro?.nextSibling) dashboard.insertBefore(target, intro.nextSibling);
              else dashboard.appendChild(target);
            }
            if (active) setHost(target);
          }
        }
      } else if (active) {
        setHost(null);
      }

      if (view === 'projects') {
        Array.from(root.querySelectorAll('main button')).forEach((button) => {
          if ((button.textContent || '').includes('مشروع جديد')) button.style.display = 'none';
        });
      }
    };

    const handleClick = (event) => {
      const button = event.target?.closest?.('button[data-brandbox-tool-chooser="1"]');
      if (!button) return;
      event.preventDefault();
      event.stopPropagation();
      router.push('/projects');
    };

    enhance();
    const observer = new MutationObserver(enhance);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    document.addEventListener('click', handleClick, true);
    return () => {
      active = false;
      observer.disconnect();
      document.removeEventListener('click', handleClick, true);
    };
  }, [router, view]);

  if (!host || view !== 'dashboard') return null;

  return createPortal(
    <section dir="rtl" className="rounded-2xl border border-[#2a2e38] bg-[#11131a] p-5">
      <div className="mb-4">
        <div className="text-[11px] font-black tracking-[0.14em] text-[#ff3344]">مساحة الإبداع</div>
        <h3 className="mt-1 text-lg font-black text-white">اختيار الأداة</h3>
        <p className="mt-1 text-xs leading-6 text-gray-500">اختر نوع العمل أولًا، ثم ستظهر لك المشاريع الخاصة بهذه الأداة فقط.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {TOOLS.map(({ id, label, description, href, icon: Icon }) => (
          <Link key={id} href={href} className="group rounded-2xl border border-[#2a2e38] bg-[#0b0d12] p-4 transition hover:-translate-y-0.5 hover:border-[#f31325]/55 hover:bg-[#f31325]/5">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#f31325]/20 bg-[#f31325]/8 text-[#ff3344] transition group-hover:bg-[#f31325] group-hover:text-white"><Icon size={21} /></span>
            <div className="mt-3 text-sm font-black text-white">{label}</div>
            <p className="mt-1 text-[11px] leading-5 text-gray-500">{description}</p>
          </Link>
        ))}
      </div>
    </section>,
    host,
  );
}
