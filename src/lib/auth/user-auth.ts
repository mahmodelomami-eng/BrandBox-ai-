import type { User } from '@supabase/supabase-js';
import type { NextRequest } from 'next/server';
import { createPrivilegedSupabaseClient, createServerSupabaseClient } from '@/lib/supabase/server';
import { isActiveProfileStatus } from '@/lib/auth/user-status';

export type ActiveUserProfile = {
  id: string;
  role: string;
  status: string;
};

export type ActiveUserAuth = {
  user: User;
  profile: ActiveUserProfile;
};

export async function authenticateActiveUser(request: NextRequest): Promise<ActiveUserAuth | null> {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return null;

  const { data, error } = await createServerSupabaseClient().auth.getUser(token);
  if (error || !data.user) return null;

  const { data: profile, error: profileError } = await createPrivilegedSupabaseClient()
    .from('profiles')
    .select('id,role,status')
    .eq('id', data.user.id)
    .maybeSingle();

  if (
    profileError ||
    !profile ||
    profile.id !== data.user.id ||
    !isActiveProfileStatus(profile.status)
  ) {
    return null;
  }

  return {
    user: data.user,
    profile: {
      id: profile.id,
      role: profile.role || 'USER',
      status: profile.status,
    },
  };
}
