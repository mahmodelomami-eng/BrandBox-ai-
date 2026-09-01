'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserSupabaseClient } from '../lib/supabase/client';
import { checkPermission } from '../lib/auth/rbac-engine';
import { isActiveProfileStatus } from '../lib/auth/user-status';

const AuthContext = createContext({
  user: null,
  profile: null,
  profileResolved: false,
  accountStatus: null,
  role: 'USER',
  roleLabel: 'مستخدم',
  creditBalance: 0,
  loading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
  hasPermission: () => false,
});

export const ROLE_LABELS = {
  SUPER_ADMIN: 'المدير العام',
  PLATFORM_ADMIN: 'مدير المنصة',
  OPERATIONS_MANAGER: 'مدير العمليات',
  CONTENT_MANAGER: 'مدير المحتوى',
  USER_MANAGER: 'مدير المستخدمين',
  SUPPORT_AGENT: 'موظف الدعم',
  FINANCE_MANAGER: 'المدير المالي',
  MARKETING_MANAGER: 'مدير التسويق',
  SECURITY_AUDITOR: 'المدقق الأمني',
  ANALYST: 'المحلل',
  ADMIN: 'مدير قديم',
  SUPPORT: 'دعم قديم',
  USER: 'مستخدم',
};

export function AuthProvider({ children }) {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [profileResolved, setProfileResolved] = useState(false);
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const authRevisionRef = useRef(0);

  const fetchProfile = useCallback(async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, first_name, last_name, phone, avatar_url, role, status, credit_balance, created_at, updated_at')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('[AuthContext] Error fetching profile:', error);
        return null;
      }
      return data;
    } catch (err) {
      console.error('[AuthContext] Profile fetch exception:', err);
      return null;
    }
  }, [supabase]);

  const refreshProfile = useCallback(async () => {
    const userId = user?.id;
    if (!userId) return;

    const revision = authRevisionRef.current;
    const prof = await fetchProfile(userId);
    if (authRevisionRef.current !== revision) return;

    setProfile(prof?.id === userId ? prof : null);
    setProfileResolved(true);
  }, [user, fetchProfile]);

  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      const revision = ++authRevisionRef.current;
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;

        if (session?.user && mounted) {
          const sessionUserId = session.user.id;
          setUser(session.user);
          setProfileResolved(false);
          setProfile((currentProfile) => currentProfile?.id === sessionUserId ? currentProfile : null);

          const prof = await fetchProfile(sessionUserId);
          if (mounted && authRevisionRef.current === revision) {
            setProfile(prof?.id === sessionUserId ? prof : null);
            setProfileResolved(true);
          }
        } else if (mounted && authRevisionRef.current === revision) {
          setUser(null);
          setProfile(null);
          setProfileResolved(true);
        }
      } catch (err) {
        console.error('[AuthContext] Session init error:', err);
        if (mounted && authRevisionRef.current === revision) {
          setUser(null);
          setProfile(null);
          setProfileResolved(true);
        }
      } finally {
        if (mounted && authRevisionRef.current === revision) setLoading(false);
      }
    }

    void initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;

      const revision = ++authRevisionRef.current;
      if (session?.user) {
        const sessionUserId = session.user.id;
        setUser(session.user);
        setProfileResolved(false);
        setProfile((currentProfile) => currentProfile?.id === sessionUserId ? currentProfile : null);

        const prof = await fetchProfile(sessionUserId);
        if (!mounted || authRevisionRef.current !== revision) return;
        setProfile(prof?.id === sessionUserId ? prof : null);
        setProfileResolved(true);
      } else {
        setUser(null);
        setProfile(null);
        setProfileResolved(true);
      }

      if (mounted && authRevisionRef.current === revision) setLoading(false);
    });

    return () => {
      mounted = false;
      authRevisionRef.current += 1;
      subscription.unsubscribe();
    };
  }, [supabase, fetchProfile]);

  const signOut = useCallback(async (redirectTo = '/') => {
    try {
      authRevisionRef.current += 1;
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
      setProfileResolved(true);
      router.replace(redirectTo);
      router.refresh();
    } catch (err) {
      console.error('[AuthContext] Sign out error:', err);
    }
  }, [supabase, router]);

  const activeProfile = isActiveProfileStatus(profile?.status) ? profile : null;
  const accountStatus = profileResolved ? profile?.status || 'unavailable' : null;
  const role = activeProfile?.role || 'USER';
  const roleLabel = ROLE_LABELS[role] || 'مستخدم';
  const creditBalance = activeProfile?.credit_balance ?? 0;

  const checkPerm = useCallback((permission) => {
    return checkPermission(role, permission);
  }, [role]);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        profileResolved,
        accountStatus,
        role,
        roleLabel,
        creditBalance,
        loading,
        signOut,
        refreshProfile,
        hasPermission: checkPerm,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
