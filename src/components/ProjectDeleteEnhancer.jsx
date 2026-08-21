'use client';

import { useEffect } from 'react';
import { deleteUserProject, listUserProjects } from '../lib/projects/projects-service';

const DELETE_MARKER = 'data-project-delete-action';

function findProjectsGrid() {
  const heading = Array.from(document.querySelectorAll('h2')).find(
    (node) => node.textContent?.trim() === 'مشاريعي'
  );
  if (!heading) return null;

  const section = heading.closest('div.space-y-8');
  if (!section) return null;

  return Array.from(section.children).find((child) =>
    child.className?.includes('grid-cols-1') && child.className?.includes('gap-y-8')
  );
}

function getProjectCards(grid) {
  return Array.from(grid.querySelectorAll(':scope > button')).filter(
    (button) => !button.textContent?.includes('مشروع جديد')
  );
}

export default function ProjectDeleteEnhancer() {
  useEffect(() => {
    let disposed = false;

    const enhance = async () => {
      const grid = findProjectsGrid();
      if (!grid || disposed) return;

      let projects;
      try {
        projects = await listUserProjects();
      } catch {
        return;
      }

      if (disposed) return;

      const cards = getProjectCards(grid);
      cards.forEach((card, index) => {
        if (card.querySelector(`[${DELETE_MARKER}]`)) return;

        const project = projects[index];
        if (!project) return;

        const mediaBox = card.firstElementChild;
        if (!mediaBox) return;

        const action = document.createElement('span');
        action.setAttribute(DELETE_MARKER, 'true');
        action.setAttribute('role', 'button');
        action.setAttribute('tabindex', '0');
        action.setAttribute('aria-label', `حذف المشروع ${project.name}`);
        action.title = 'حذف المشروع';
        action.className = 'absolute left-3 bottom-3 z-20 inline-flex h-9 items-center gap-1.5 rounded-xl border border-red-500/30 bg-black/70 px-3 text-[11px] font-bold text-red-300 opacity-0 backdrop-blur-md transition hover:border-red-400/60 hover:bg-red-500/15 hover:text-red-200 group-hover:opacity-100 focus:opacity-100';
        action.innerHTML = `
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M3 6h18" />
            <path d="M8 6V4h8v2" />
            <path d="M19 6l-1 14H6L5 6" />
            <path d="M10 11v5" />
            <path d="M14 11v5" />
          </svg>
          حذف
        `;

        const runDelete = async (event) => {
          event.preventDefault();
          event.stopPropagation();

          const confirmed = window.confirm(
            `هل أنت متأكد من حذف المشروع «${project.name}»؟\nلا يمكن التراجع عن هذه العملية.`
          );
          if (!confirmed) return;

          action.style.pointerEvents = 'none';
          action.style.opacity = '1';
          action.textContent = 'جارٍ الحذف…';

          try {
            await deleteUserProject(project.id);
            window.location.reload();
          } catch (error) {
            action.style.pointerEvents = '';
            action.innerHTML = 'تعذر الحذف';
            window.setTimeout(() => {
              window.location.reload();
            }, 1200);
          }
        };

        action.addEventListener('click', runDelete);
        action.addEventListener('keydown', (event) => {
          if (event.key === 'Enter' || event.key === ' ') runDelete(event);
        });

        mediaBox.appendChild(action);
      });
    };

    enhance();
    const observer = new MutationObserver(() => {
      window.clearTimeout(window.__brandboxProjectDeleteTimer);
      window.__brandboxProjectDeleteTimer = window.setTimeout(enhance, 80);
    });
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      disposed = true;
      observer.disconnect();
      window.clearTimeout(window.__brandboxProjectDeleteTimer);
    };
  }, []);

  return null;
}
