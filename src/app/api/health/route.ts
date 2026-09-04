import { NextResponse } from 'next/server';
import { HealthCheckEngine } from '@/lib/observability/telemetry';

export async function GET() {
  try {
    const report = await HealthCheckEngine.runFullHealthCheck();
    const statusCode = report.status === 'healthy' ? 200 : report.status === 'degraded' ? 200 : 503;
    return NextResponse.json(report, { status: statusCode });
  } catch {
    // Health is a public operational endpoint. Never reflect exception messages,
    // configuration details, provider responses, or other server internals.
    return NextResponse.json(
      { status: 'unhealthy', timestamp: new Date().toISOString(), liveness: true, readiness: false },
      { status: 503 }
    );
  }
}
