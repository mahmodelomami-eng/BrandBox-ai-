import { NextRequest } from 'next/server';
import { isSocialProviderId } from '@/lib/social/providers';
import {
  completeOAuthConnection,
  defaultOAuthFailureRedirect,
  failOAuthConnection,
  oauthSuccessRedirect,
} from '@/lib/social/oauth-service';

type RouteContext = { params: Promise<{ provider: string }> };

function redirect(location: string) {
  return new Response(null, { status: 302, headers: { Location: location, 'Cache-Control': 'no-store' } });
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { provider: providerValue } = await context.params;
  if (!isSocialProviderId(providerValue)) return redirect(defaultOAuthFailureRedirect(providerValue));
  const state = request.nextUrl.searchParams.get('state')?.trim() || '';
  const providerError = request.nextUrl.searchParams.get('error')?.trim() || '';
  const code = request.nextUrl.searchParams.get('code')?.trim() || '';

  if (!state) return redirect(defaultOAuthFailureRedirect(providerValue));
  if (providerError) {
    try {
      return redirect(await failOAuthConnection(providerValue, state, 'provider_denied'));
    } catch {
      return redirect(defaultOAuthFailureRedirect(providerValue));
    }
  }
  if (!code) {
    try {
      return redirect(await failOAuthConnection(providerValue, state, 'missing_code'));
    } catch {
      return redirect(defaultOAuthFailureRedirect(providerValue));
    }
  }

  try {
    const result = await completeOAuthConnection(providerValue, state, code);
    return redirect(oauthSuccessRedirect(providerValue, result.returnUri, result.connectionCount));
  } catch {
    return redirect(defaultOAuthFailureRedirect(providerValue));
  }
}
