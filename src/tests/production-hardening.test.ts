import { HealthCheckEngine } from '../lib/observability/telemetry';

export async function runProductionHardeningTests() {
  const health = await HealthCheckEngine.runFullHealthCheck();
  const databaseConfigured = Boolean(
    process.env.SUPABASE_SERVICE_ROLE_KEY &&
      (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL),
  );

  // CI must be deterministic even when deployment secrets are intentionally not
  // exposed to pull-request jobs. When database credentials are present we still
  // require full readiness; otherwise we require application liveness and no
  // unhealthy non-database components.
  const nonDatabaseHealthy = health.components
    .filter((component) => component.name !== 'Database (PostgreSQL)')
    .every((component) => component.status !== 'unhealthy');

  return {
    allPassed: health.liveness === true && nonDatabaseHealthy && (!databaseConfigured || health.readiness === true),
    databaseConfigured,
    health,
  };
}

runProductionHardeningTests()
  .then((result) => {
    if (!result.allPassed) {
      throw new Error('Production hardening health check failed.');
    }

    console.log(
      result.databaseConfigured
        ? 'Production hardening health check passed with database readiness.'
        : 'Production hardening health check passed; external database readiness is deferred to deployment health checks.',
    );
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
