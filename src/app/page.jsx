import { redirect } from 'next/navigation';
import HomeExperience from '../components/HomeExperience';

const LEGACY_VIEW_MAP = {
  dashboard: '/dashboard',
  projects: '/projects',
  'project-workspace': '/projects',
  chat: '/projects/chat',
  images: '/projects/images',
  video: '/projects/video',
  audio: '/projects/audio',
  'brand-kit': '/brand-kit',
  templates: '/templates',
  billing: '/pricing',
  pricing: '/pricing',
  settings: '/dashboard/account',
  account: '/dashboard/account',
  admin: '/admin',
  'admin-shell': '/admin',
};

export default async function RootPage({ searchParams }) {
  const params = await searchParams;
  const viewParam = typeof params?.view === 'string' ? params.view : null;
  const legacyTarget = viewParam ? LEGACY_VIEW_MAP[viewParam] : null;

  if (legacyTarget) redirect(legacyTarget);

  return <HomeExperience />;
}
