import { NextResponse } from 'next/server';
import { getOpenRouterRuntimeReadiness } from '@/lib/ai/openrouter-runtime-readiness';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const readiness = await getOpenRouterRuntimeReadiness();
    const ready = readiness.configured
      && readiness.authenticated
      && readiness.imageCatalogAvailable
      && readiness.videoCatalogAvailable;

    return NextResponse.json({
      status: ready ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      openrouter: readiness,
    });
  } catch {
    // Never expose provider response bodies, key metadata, usage, limits or credentials.
    return NextResponse.json({
      status: 'degraded',
      timestamp: new Date().toISOString(),
      openrouter: {
        configured: Boolean(process.env.OPENROUTER_API_KEY),
        authenticated: false,
        imageCatalogAvailable: false,
        videoCatalogAvailable: false,
      },
    });
  }
}
