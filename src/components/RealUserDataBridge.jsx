'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { createBrowserSupabaseClient } from '../lib/supabase/client';

export default function RealUserDataBridge({ children }) {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    let observer;

    const setText = (node, value) => {
      if (!node) return;
      node.textContent = String(value);
    };

    const hydrateMetric = (label, value) => {
      const nodes = Array.from(document.querySelectorAll('div,span,p,h1,h2,h3'));
      const labelNode = nodes.find((node) => node.textContent?.trim() === label);
      if (!labelNode) return;
      const container = labelNode.parentElement;
      if (!container) return;
      const candidates = Array.from(container.querySelectorAll('div,span,p'))
        .filter((node) => node !== labelNode)
        .filter((node) => /^\s*[+-]?\d+(?:\.\d+)?\s*(?:نقطة|مشاريع تسويقية|ملفات بصرية)?\s*$/.test(node.textContent || ''));
      if (candidates[0]) setText(candidates[0], value);
    };

    const hydrateIdentity = (profile, authUser) => {
      const fullName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ').trim();
      const email = profile?.email || authUser?.email || '';
      if (fullName) document.querySelectorAll('[data-brandbox-user-name]').forEach((node) => setText(node, fullName));
      if (email) document.querySelectorAll('[data-brandbox-user-email]').forEach((node) => setText(node, email));
      document.documentElement.dataset.brandboxUserId = authUser?.id || '';
      document.documentElement.dataset.brandboxUserRole = profile?.role || 'USER';
    };

    const hydrate = async () => {
      try {
        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;
        if (!authData.user) return;
        const userId = authData.user.id;

        const [profileResult, projectsResult, assetsResult, transactionsResult] = await Promise.all([
          supabase.from('profiles').select('id,email,first_name,last_name,phone,avatar_url,role,status,credit_balance,created_at,updated_at').eq('id', userId).single(),
          supabase.from('projects').select('id,owner_id,name,type,description,industry,target_audience,language,tone,thumbnail_url,created_at,updated_at').eq('owner_id', userId).order('updated_at', { ascending: false }),
          supabase.from('assets').select('id', { count: 'exact', head: true }).eq('user_id', userId),
          supabase.from('credit_transactions').select('id,amount,transaction_type,description,reference_type,reference_id,created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(20),
        ]);

        if (profileResult.error) throw profileResult.error;
        if (projectsResult.error) throw projectsResult.error;
        if (assetsResult.error) throw assetsResult.error;
        if (transactionsResult.error) throw transactionsResult.error;
        if (cancelled) return;

        const profile = profileResult.data;
        const projects = (projectsResult.data || []).map((project) => ({
          id: project.id,
          ownerId: project.owner_id,
          ownerName: [profile.first_name, profile.last_name].filter(Boolean).join(' '),
          name: project.name,
          type: project.type,
          description: project.description || '',
          industry: project.industry || 'عام',
          targetAudience: project.target_audience || 'الجميع',
          language: project.language || 'العربية',
          tone: project.tone || 'احترافي',
          timeAgo: new Date(project.updated_at || project.created_at).toLocaleDateString('ar-LY'),
          thumbnail: project.thumbnail_url || null,
          createdAt: project.created_at,
          updatedAt: project.updated_at,
        }));

        const dashboard = {
          user: {
            id: authData.user.id,
            email: authData.user.email,
            firstName: profile.first_name || '',
            lastName: profile.last_name || '',
            phone: profile.phone || null,
            avatarUrl: profile.avatar_url || null,
            adminRole: profile.role || 'USER',
            status: profile.status || 'active',
            creditBalance: profile.credit_balance ?? 0,
            createdAt: profile.created_at,
          },
          projects,
          projectsCount: projects.length,
          assetsCount: assetsResult.count || 0,
          creditTransactions: transactionsResult.data || [],
          syncedAt: new Date().toISOString(),
        };

        window.dispatchEvent(new CustomEvent('brandbox:real-user-data', { detail: dashboard }));
        hydrateIdentity(profile, authData.user);

        const syncVisibleMetrics = () => {
          hydrateMetric('المشاريع النشطة', `${dashboard.projectsCount}`);
          hydrateMetric('الرصيد المتاح', `${dashboard.user.creditBalance} نقطة`);
          hydrateMetric('الأصول المنسقة', `${dashboard.assetsCount}`);
        };
        syncVisibleMetrics();
        observer = new MutationObserver(syncVisibleMetrics);
        observer.observe(document.body, { childList: true, subtree: true });
        setReady(true);
      } catch (err) {
        if (!cancelled) {
          console.error('[BrandBox] Failed to hydrate real user data:', err);
          setError(err?.message || 'تعذر تحميل بيانات الحساب.');
          setReady(true);
        }
      }
    };

    hydrate();
    return () => {
      cancelled = true;
      observer?.disconnect();
    };
  }, [supabase]);

  return (
    <>
      {children}
      {error && <div className="fixed bottom-4 right-4 z-[70] max-w-sm rounded-xl border border-amber-500/30 bg-[#121520] px-4 py-3 text-xs text-amber-200 shadow-2xl">تعذر مزامنة بيانات الحساب: {error}</div>}
      {!ready && <div className="fixed inset-0 z-[65] pointer-events-none" aria-hidden="true" />}
    </>
  );
}
