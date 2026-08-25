import { createHash } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createPrivilegedSupabaseClient, createServerSupabaseClient } from '@/lib/supabase/server';

function normalizePhone(value: unknown) {
  return String(value || '').trim().replace(/[\s()-]/g, '');
}

function cleanName(value: unknown) {
  return String(value || '').trim().replace(/\s+/g, ' ').slice(0, 80);
}

async function authenticate(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const { data, error } = await createServerSupabaseClient().auth.getUser(token);
  return error ? null : data.user;
}

async function getActivePolicyVersions(database: ReturnType<typeof createPrivilegedSupabaseClient>) {
  const { data, error } = await database
    .from('legal_policy_versions')
    .select('policy_type,version')
    .eq('is_active', true);

  if (error) throw new Error(`LEGAL_POLICY_LOOKUP_FAILED: ${error.message}`);

  const termsVersion = data?.find((row) => row.policy_type === 'terms')?.version;
  const privacyVersion = data?.find((row) => row.policy_type === 'privacy')?.version;
  if (!termsVersion || !privacyVersion) throw new Error('LEGAL_POLICY_VERSION_MISSING');

  return { termsVersion, privacyVersion };
}

function getIpHash(request: NextRequest) {
  const salt = process.env.CONSENT_AUDIT_SALT;
  if (!salt) return null;
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const ip = forwarded || request.headers.get('x-real-ip') || '';
  if (!ip) return null;
  return createHash('sha256').update(`${salt}:${ip}`).digest('hex');
}

export async function GET(request: NextRequest) {
  const user = await authenticate(request);
  if (!user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  const database = createPrivilegedSupabaseClient();
  try {
    const [{ data: profile, error: profileError }, policyVersions] = await Promise.all([
      database
        .from('profiles')
        .select('first_name,last_name,phone,whatsapp_phone,onboarding_completed_at,email')
        .eq('id', user.id)
        .maybeSingle(),
      getActivePolicyVersions(database),
    ]);

    if (profileError || !profile) {
      return NextResponse.json({ error: 'PROFILE_UNAVAILABLE' }, { status: 503 });
    }

    const { data: consent, error: consentError } = await database
      .from('user_legal_consents')
      .select('terms_version,privacy_version,accepted_at')
      .eq('user_id', user.id)
      .eq('terms_version', policyVersions.termsVersion)
      .eq('privacy_version', policyVersions.privacyVersion)
      .order('accepted_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (consentError) {
      return NextResponse.json({ error: 'CONSENT_STATUS_UNAVAILABLE' }, { status: 503 });
    }

    const complete = Boolean(
      profile.first_name?.trim()
      && profile.last_name?.trim()
      && profile.phone
      && profile.whatsapp_phone
      && profile.onboarding_completed_at
      && consent,
    );

    return NextResponse.json({
      complete,
      profile: {
        firstName: profile.first_name || '',
        lastName: profile.last_name || '',
        phone: profile.phone || '',
        whatsappPhone: profile.whatsapp_phone || '',
        email: profile.email || user.email || '',
      },
      policies: policyVersions,
      consentAcceptedAt: consent?.accepted_at || null,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'ONBOARDING_STATUS_FAILED' },
      { status: 503 },
    );
  }
}

export async function POST(request: NextRequest) {
  const user = await authenticate(request);
  if (!user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  let body: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    whatsappPhone?: string;
    legalAccepted?: boolean;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 });
  }

  const firstName = cleanName(body.firstName);
  const lastName = cleanName(body.lastName);
  const phone = normalizePhone(body.phone);
  const whatsappPhone = normalizePhone(body.whatsappPhone);

  if (!firstName || !lastName) {
    return NextResponse.json({ error: 'NAME_REQUIRED' }, { status: 400 });
  }
  if (!/^\+?\d{8,15}$/.test(phone)) {
    return NextResponse.json({ error: 'INVALID_PHONE' }, { status: 400 });
  }
  if (!/^\+?\d{8,15}$/.test(whatsappPhone)) {
    return NextResponse.json({ error: 'INVALID_WHATSAPP_PHONE' }, { status: 400 });
  }
  if (body.legalAccepted !== true) {
    return NextResponse.json({ error: 'LEGAL_ACCEPTANCE_REQUIRED' }, { status: 400 });
  }

  const database = createPrivilegedSupabaseClient();
  const now = new Date().toISOString();

  try {
    const policies = await getActivePolicyVersions(database);
    const { error: profileError } = await database
      .from('profiles')
      .update({
        first_name: firstName,
        last_name: lastName,
        phone,
        whatsapp_phone: whatsappPhone,
        onboarding_completed_at: now,
        updated_at: now,
      })
      .eq('id', user.id);

    if (profileError) {
      return NextResponse.json({ error: 'PROFILE_ONBOARDING_UPDATE_FAILED' }, { status: 503 });
    }

    const userAgent = (request.headers.get('user-agent') || '').slice(0, 512) || null;
    const authProvider = typeof user.app_metadata?.provider === 'string' ? user.app_metadata.provider : null;
    const { error: consentError } = await database
      .from('user_legal_consents')
      .upsert({
        user_id: user.id,
        terms_version: policies.termsVersion,
        privacy_version: policies.privacyVersion,
        accepted_at: now,
        accepted_ip_hash: getIpHash(request),
        accepted_user_agent: userAgent,
        auth_provider: authProvider,
        metadata: { acceptance_source: 'onboarding' },
      }, { onConflict: 'user_id,terms_version,privacy_version' });

    if (consentError) {
      return NextResponse.json({ error: 'LEGAL_CONSENT_SAVE_FAILED' }, { status: 503 });
    }

    await database.from('user_notifications').insert({
      user_id: user.id,
      title: 'تم استكمال بيانات حسابك',
      body: 'تم حفظ بيانات الحساب ورقم واتساب وتوثيق موافقتك على شروط الاستخدام وسياسة الخصوصية.',
      kind: 'account',
    });

    return NextResponse.json({
      success: true,
      firstName,
      lastName,
      phone,
      whatsappPhone,
      policies,
      acceptedAt: now,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'PROFILE_ONBOARDING_FAILED' },
      { status: 503 },
    );
  }
}
