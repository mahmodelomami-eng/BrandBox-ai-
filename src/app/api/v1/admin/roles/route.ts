import { NextRequest, NextResponse } from 'next/server';
import { createPrivilegedSupabaseClient, createServerSupabaseClient } from '@/lib/supabase/server';
import {
  AdminRole,
  OWNER_CONCEPT,
  ROLE_DEFINITIONS,
  ROLE_PERMISSIONS,
} from '@/lib/auth/rbac-engine';
import { canAssignRoles, canReadUsers, isKnownRole } from '@/lib/admin/admin-user-policy';
import { getRoleGuidance } from '@/lib/admin/role-guidance';

async function actorRoleFromRequest(request: NextRequest): Promise<AdminRole | null> {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return null;

  const { data, error } = await createServerSupabaseClient().auth.getUser(token);
  if (error || !data.user) return null;

  const { data: profile, error: profileError } = await createPrivilegedSupabaseClient()
    .from('profiles')
    .select('role,status')
    .eq('id', data.user.id)
    .maybeSingle();

  if (profileError || !profile || profile.status === 'suspended') return null;
  const role = (profile.role || 'USER') as AdminRole;
  return isKnownRole(role) && canReadUsers(role) ? role : null;
}

export async function GET(request: NextRequest) {
  const actorRole = await actorRoleFromRequest(request);
  if (!actorRole) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  const actorCanAssignRoles = canAssignRoles(actorRole);
  const roles = Object.values(ROLE_DEFINITIONS).map((definition) => ({
    ...definition,
    ...getRoleGuidance(definition.role),
    permissions: Array.from(ROLE_PERMISSIONS[definition.role]).sort(),
    assignableByActor: actorCanAssignRoles && definition.assignable,
  }));

  return NextResponse.json({
    owner: OWNER_CONCEPT,
    roles,
    actorRole,
    capabilities: {
      canAssignRoles: actorCanAssignRoles,
    },
  });
}
