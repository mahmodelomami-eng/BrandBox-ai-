import { NextResponse } from 'next/server';
import { HealthCheckEngine } from '@/lib/observability/telemetry';

export async function GET() {
  try {
    const report = await HealthCheckEngine.runFullHealthCheck();
    const statusCode = report.status === 'healthy' ? 200 : report.status === 'degraded' ? 200 : 503;
    return NextResponse.json(report, { status: statusCode });
  } catch (error: any) {
    return NextResponse.json(
      { status: 'unhealthy', timestamp: new Date().toISOString(), error: error?.message || 'Failed health check' },
      { status: 500 }
    );
  }
}
