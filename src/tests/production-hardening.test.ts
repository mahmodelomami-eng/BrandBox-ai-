import { HealthCheckEngine } from '../lib/observability/telemetry';

export async function runProductionHardeningTests() {
  const health = await HealthCheckEngine.runFullHealthCheck();
  return { allPassed: health.status === 'healthy' };
}
