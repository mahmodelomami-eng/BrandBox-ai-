'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserSupabaseClient } from '../lib/supabase/client';
import { checkPermission } from '../lib/auth/rbac-engine';

const AuthContext = createContext({
  user: null,
  profile: null,
  role: 'USER',
  roleLabel: 'مستخدم',
  creditBalance: 0,
  loading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
  hasPermission: () => false,
});

export const ROLE_LABELS = {
  SUPER_ADMIN: 'مدير عام',
  ADMIN: 'مدير',
  SUPPORT: 'مشرف',
  USER: 'مستخدم',
};

export function AuthProvider({ children }) {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

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
    if (!user?.id) return;
    const prof = await fetchProfile(user.id);
    if (prof) setProfile(prof);
  }, [user, fetchProfile]);

  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;

        if (session?.user && mounted) {
          setUser(session.user);
          const prof = await fetchProfile(session.user.id);
          if (mounted) setProfile(prof);
        } else if (mounted) {
          setUser(null);
          setProfile(null);
        }
      } catch (err) {
        console.error('[AuthContext] Session init error:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;
      if (session?.user) {
        setUser(session.user);
        const prof = await fetchProfile(session.user.id);
        if (mounted) setProfile(prof);
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase, fetchProfile]);

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
      router.replace('/');
      router.refresh();
    } catch (err) {
      console.error('[AuthContext] Sign out error:', err);
    }
  }, [supabase, router]);

  const role = profile?.role || 'USER';
  const roleLabel = ROLE_LABELS[role] || 'مستخدم';
  const creditBalance = profile?.credit_balance ?? 0;

  const checkPerm = useCallback((permission) => {
    return checkPermission(role, permission);
  }, [role]);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
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
