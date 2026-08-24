import { createPrivilegedSupabaseClient } from '../supabase/server';

type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';

type HealthComponent = {
  name: string;
  status: HealthStatus;
  latencyMs: number;
  detail?: string;
};

async function checkDatabase(): Promise<HealthComponent> {
  const startedAt = Date.now();

  try {
    const supabase = createPrivilegedSupabaseClient();
    const { error } = await supabase
      .from('profiles')
      .select('id', { head: true, count: 'exact' });

    if (error) {
      return {
        name: 'Database (PostgreSQL)',
        status: 'unhealthy',
        latencyMs: Date.now() - startedAt,
        detail: 'Database query failed',
      };
    }

    return {
      name: 'Database (PostgreSQL)',
      status: 'healthy',
      latencyMs: Date.now() - startedAt,
    };
  } catch {
    return {
      name: 'Database (PostgreSQL)',
      status: 'unhealthy',
      latencyMs: Date.now() - startedAt,
      detail: 'Database configuration or connectivity failed',
    };
  }
}

function checkAiGateway(): HealthComponent {
  const startedAt = Date.now();
  const configured = Boolean(
    process.env.OPENROUTER_API_KEY ||
      process.env.OPENAI_API_KEY ||
      process.env.ANTHROPIC_API_KEY ||
      process.env.GOOGLE_VERTEX_KEY ||
      process.env.BFL_FLUX_API_KEY
  );

  return {
    name: 'AI Provider Gateway',
    status: configured ? 'healthy' : 'degraded',
    latencyMs: Date.now() - startedAt,
    ...(configured ? {} : { detail: 'No AI provider credential is configured' }),
  };
}

export class HealthCheckEngine {
  public static async runFullHealthCheck() {
    const database = await checkDatabase();
    const aiGateway = checkAiGateway();
    const application: HealthComponent = {
      name: 'Application Runtime',
      status: 'healthy',
      latencyMs: 0,
    };

    const components = [application, database, aiGateway];
    const status: HealthStatus = components.some((component) => component.status === 'unhealthy')
      ? 'unhealthy'
      : components.some((component) => component.status === 'degraded')
        ? 'degraded'
        : 'healthy';

    return {
      status,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'production',
      liveness: true,
      readiness: database.status === 'healthy',
      components,
    };
  }
}

export class Logger {
  public static info(message: string, ctx: any = {}) { return { timestamp: new Date().toISOString(), level: 'INFO', message, context: ctx }; }
  public static warn(message: string, ctx: any = {}) { return { timestamp: new Date().toISOString(), level: 'WARN', message, context: ctx }; }
  public static error(message: string, err: any, ctx: any = {}) { return { timestamp: new Date().toISOString(), level: 'ERROR', message, context: ctx }; }
  public static security(message: string, ctx: any = {}) { return { timestamp: new Date().toISOString(), level: 'SECURITY', message, context: ctx }; }
}
