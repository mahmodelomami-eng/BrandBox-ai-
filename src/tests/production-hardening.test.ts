import { HealthCheckEngine } from '../lib/observability/telemetry';

export async function runProductionHardeningTests() {
  const health = await HealthCheckEngine.runFullHealthCheck();
  return { allPassed: health.status === 'healthy' };
}

runProductionHardeningTests()
  .then((result) => {
    if (!result.allPassed) {
      throw new Error('Production hardening health check failed.');
    }

    console.log('Production hardening health check passed.');
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
