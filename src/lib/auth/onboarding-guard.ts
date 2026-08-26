import { createPrivilegedSupabaseClient } from '../supabase/server';

export interface OnboardingGuardResult {
  ok: boolean;
  code?: 'PROFILE_INCOMPLETE' | 'LEGAL_CONSENT_REQUIRED' | 'ONBOARDING_GUARD_UNAVAILABLE';
}

export async function requireCompletedOnboarding(userId: string): Promise<OnboardingGuardResult> {
  try {
    const database = createPrivilegedSupabaseClient();
    const [{ data: profile, error: profileError }, { data: policies, error: policiesError }] = await Promise.all([
      database
        .from('profiles')
        .select('first_name,last_name,phone,whatsapp_phone,onboarding_completed_at')
        .eq('id', userId)
        .maybeSingle(),
      database
        .from('legal_policy_versions')
        .select('policy_type,version,effective_at')
        .eq('is_active', true)
        .order('effective_at', { ascending: false }),
    ]);

    if (profileError || policiesError || !profile) {
      return { ok: false, code: 'ONBOARDING_GUARD_UNAVAILABLE' };
    }

    const profileComplete = Boolean(
      profile.first_name?.trim()
      && profile.last_name?.trim()
      && profile.phone
      && profile.whatsapp_phone
      && profile.onboarding_completed_at,
    );

    if (!profileComplete) return { ok: false, code: 'PROFILE_INCOMPLETE' };

    const termsVersion = policies?.find((row) => row.policy_type === 'terms')?.version;
    const privacyVersion = policies?.find((row) => row.policy_type === 'privacy')?.version;
    if (!termsVersion || !privacyVersion) {
      return { ok: false, code: 'ONBOARDING_GUARD_UNAVAILABLE' };
    }

    const { data: consent, error: consentError } = await database
      .from('user_legal_consents')
      .select('id')
      .eq('user_id', userId)
      .eq('terms_version', termsVersion)
      .eq('privacy_version', privacyVersion)
      .limit(1)
      .maybeSingle();

    if (consentError) return { ok: false, code: 'ONBOARDING_GUARD_UNAVAILABLE' };
    if (!consent) return { ok: false, code: 'LEGAL_CONSENT_REQUIRED' };

    return { ok: true };
  } catch {
    return { ok: false, code: 'ONBOARDING_GUARD_UNAVAILABLE' };
  }
}
