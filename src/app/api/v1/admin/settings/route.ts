import { NextRequest, NextResponse } from 'next/server';
import { createPrivilegedSupabaseClient, createServerSupabaseClient } from '@/lib/supabase/server';
import { AdminRole, checkPermission } from '@/lib/auth/rbac-engine';
import { isKnownRole } from '@/lib/admin/admin-user-policy';
import { isActiveProfileStatus } from '@/lib/auth/user-status';
import {
  PLATFORM_SETTING_DEFINITIONS,
  PlatformSettingKey,
  defaultPlatformSettings,
  isPlatformSettingKey,
  validateSettingValue,
} from '@/lib/admin/platform-settings';

async function actorFromRequest(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return null;

  const { data, error } = await createServerSupabaseClient().auth.getUser(token);
  if (error || !data.user) return null;

  const database = createPrivilegedSupabaseClient();
  const { data: profile, error: profileError } = await database
    .from('profiles')
    .select('id,email,role,status')
    .eq('id', data.user.id)
    .maybeSingle();

  if (profileError || !profile || !isActiveProfileStatus(profile.status)) return null;

  const role = (profile.role || 'USER') as AdminRole;
  if (!isKnownRole(role)) return null;

  return {
    userId: data.user.id,
    email: profile.email || data.user.email || '',
    role,
  };
}

export async function GET(request: NextRequest) {
  const actor = await actorFromRequest(request);
  if (!actor) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  if (!checkPermission(actor.role, 'settings.read')) {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }

  const database = createPrivilegedSupabaseClient();
  const { data, error } = await database
    .from('platform_settings')
    .select('key,category,value,updated_at')
    .eq('is_sensitive', false)
    .order('key');

  if (error) {
    return NextResponse.json({ error: 'SETTINGS_UNAVAILABLE' }, { status: 503 });
  }

  const settings = defaultPlatformSettings();
  for (const row of data || []) {
    if (isPlatformSettingKey(row.key)) {
      settings[row.key] = row.value;
    }
  }

  return NextResponse.json({
    settings,
    definitions: PLATFORM_SETTING_DEFINITIONS,
    capabilities: {
      canManageSettings: checkPermission(actor.role, 'settings.manage'),
      canManageSecurity: checkPermission(actor.role, 'security.manage'),
    },
    actorRole: actor.role,
  });
}

export async function PATCH(request: NextRequest) {
  const actor = await actorFromRequest(request);
  if (!actor) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  if (!checkPermission(actor.role, 'settings.manage')) {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }

  let body: { settings?: Record<string, unknown> };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 });
  }

  if (!body.settings || typeof body.settings !== 'object' || Array.isArray(body.settings)) {
    return NextResponse.json({ error: 'INVALID_SETTINGS_PAYLOAD' }, { status: 400 });
  }

  const entries = Object.entries(body.settings);
  if (!entries.length || entries.length > 50) {
    return NextResponse.json({ error: 'INVALID_SETTINGS_COUNT' }, { status: 400 });
  }

  const database = createPrivilegedSupabaseClient();
  const validatedEntries: Array<[PlatformSettingKey, unknown]> = [];

  for (const [key, rawValue] of entries) {
    if (!isPlatformSettingKey(key)) {
      return NextResponse.json({ error: `INVALID_SETTING_KEY:${key}` }, { status: 400 });
    }
    if (key.startsWith('security.') && !checkPermission(actor.role, 'security.manage')) {
      return NextResponse.json({ error: 'SECURITY_SETTING_FORBIDDEN' }, { status: 403 });
    }
    validatedEntries.push([key, rawValue]);
  }

  const keys = validatedEntries.map(([key]) => key);
  const { data: beforeRows, error: beforeError } = await database
    .from('platform_settings')
    .select('key,value')
    .in('key', keys)
    .eq('is_sensitive', false);

  if (beforeError) {
    return NextResponse.json({ error: 'SETTINGS_READ_FAILED' }, { status: 503 });
  }

  const before = Object.fromEntries((beforeRows || []).map((row) => [row.key, row.value]));
  const now = new Date().toISOString();
  const rows = [];

  try {
    for (const [key, rawValue] of validatedEntries) {
      const definition = PLATFORM_SETTING_DEFINITIONS.find((item) => item.key === key);
      if (!definition) throw new Error('INVALID_SETTING_KEY');
      rows.push({
        key,
        category: definition.category,
        value: validateSettingValue(key, rawValue),
        is_sensitive: false,
        updated_by: actor.userId,
        updated_at: now,
      });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'INVALID_SETTING_VALUE';
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const { error: upsertError } = await database
    .from('platform_settings')
    .upsert(rows, { onConflict: 'key' });

  if (upsertError) {
    return NextResponse.json({ error: 'SETTINGS_UPDATE_FAILED' }, { status: 503 });
  }

  const after = Object.fromEntries(rows.map((row) => [row.key, row.value]));
  await database.from('audit_logs').insert({
    actor_id: actor.userId,
    actor_role: actor.role,
    action: 'ADMIN_UPDATED_PLATFORM_SETTINGS',
    resource: 'platform_settings',
    resource_id: null,
    before_state: before,
    after_state: after,
    metadata: { keys },
    created_at: now,
  });

  return NextResponse.json({ success: true, settings: after });
}
