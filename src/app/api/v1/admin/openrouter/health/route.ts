import { NextRequest, NextResponse } from 'next/server';
import { createPrivilegedSupabaseClient, createServerSupabaseClient } from '@/lib/supabase/server';

type AdminRole = 'SUPER_ADMIN' | 'ADMIN' | 'SUPPORT' | 'USER';

async function requireAdmin(request: NextRequest) {
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
  if (!['SUPER_ADMIN', 'ADMIN'].includes(role)) return null;

  return { userId: data.user.id, role };
}

function finiteOrNull(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export async function GET(request: NextRequest) {
  const actor = await requireAdmin(request);
  if (!actor) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      { connected: false, status: 'NO_KEY', message: 'OPENROUTER_API_KEY is not configured for this deployment.' },
      { status: 503 },
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch('https://openrouter.ai/api/v1/key', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
      },
      cache: 'no-store',
      signal: controller.signal,
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      const status = response.status === 401 || response.status === 403
        ? 'UNAUTHORIZED_KEY'
        : response.status === 429
          ? 'RATE_LIMITED'
          : 'OPENROUTER_UNAVAILABLE';

      return NextResponse.json(
        { connected: false, status, upstreamStatus: response.status },
        { status: response.status === 401 || response.status === 403 ? 502 : 503 },
      );
    }

    const info = payload?.data || {};
    return NextResponse.json({
      connected: true,
      status: 'CONNECTED',
      account: {
        isFreeTier: Boolean(info.is_free_tier),
        isManagementKey: Boolean(info.is_management_key),
        limitUsd: finiteOrNull(info.limit),
        limitRemainingUsd: finiteOrNull(info.limit_remaining),
        usageUsd: finiteOrNull(info.usage),
        usageDailyUsd: finiteOrNull(info.usage_daily),
        usageMonthlyUsd: finiteOrNull(info.usage_monthly),
        limitReset: info.limit_reset || null,
        expiresAt: info.expires_at || null,
      },
      checkedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        connected: false,
        status: error instanceof Error && error.name === 'AbortError' ? 'TIMEOUT' : 'NETWORK_ERROR',
      },
      { status: 503 },
    );
  } finally {
    clearTimeout(timeout);
  }
}
