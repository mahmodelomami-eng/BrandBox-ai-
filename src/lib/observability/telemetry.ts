import { createPrivilegedSupabaseClient } from '../supabase/server';

type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';

type HealthComponent = {
  name: string;
  status: HealthStatus;
  latencyMs: number;
  detail?: string;
};

const REDACTED = '[REDACTED]';
const SENSITIVE_CONTEXT_KEY = /(?:authorization|cookie|password|passcode|secret|signature|api[_-]?key|access[_-]?token|refresh[_-]?token|service[_-]?role|private[_-]?key|digital[_-]?code|delivered[_-]?code|provider[_-]?response)/i;

function sanitizeLogValue(value: unknown, seen = new WeakSet<object>()): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value !== 'object') return value;

  const objectValue = value as object;
  if (seen.has(objectValue)) return '[Circular]';
  seen.add(objectValue);

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeLogValue(item, seen));
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, nestedValue] of Object.entries(value as Record<string, unknown>)) {
    sanitized[key] = SENSITIVE_CONTEXT_KEY.test(key)
      ? REDACTED
      : sanitizeLogValue(nestedValue, seen);
  }
  return sanitized;
}

function sanitizeContext(ctx: unknown): Record<string, unknown> {
  if (!ctx || typeof ctx !== 'object' || Array.isArray(ctx)) return {};
  return sanitizeLogValue(ctx) as Record<string, unknown>;
}

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
  public static info(message: string, ctx: unknown = {}) {
    return { timestamp: new Date().toISOString(), level: 'INFO', message, context: sanitizeContext(ctx) };
  }

  public static warn(message: string, ctx: unknown = {}) {
    return { timestamp: new Date().toISOString(), level: 'WARN', message, context: sanitizeContext(ctx) };
  }

  public static error(message: string, err: unknown, ctx: unknown = {}) {
    const errorName = err instanceof Error ? err.name : 'Error';
    return {
      timestamp: new Date().toISOString(),
      level: 'ERROR',
      message,
      error: { name: errorName },
      context: sanitizeContext(ctx),
    };
  }

  public static security(message: string, ctx: unknown = {}) {
    return { timestamp: new Date().toISOString(), level: 'SECURITY', message, context: sanitizeContext(ctx) };
  }
}
