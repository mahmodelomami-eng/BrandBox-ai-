export type AuditActionType =
  | 'ADMIN_CHANGED_PLAN'
  | 'ADMIN_ADJUSTED_CREDITS'
  | 'ADMIN_CANCELLED_SUBSCRIPTION'
  | 'ADMIN_EXTENDED_SUBSCRIPTION'
  | 'ADMIN_SUSPENDED_USER'
  | 'ADMIN_REACTIVATED_USER'
  | 'ADMIN_CHANGED_ADMIN_ROLE'
  | 'ADMIN_CHANGED_MODEL_PRICE'
  | 'AUTHENTICATION_EVENT'
  | 'SECURITY_EVENT'
  | 'PAYMENT_EVENT';

export interface AuditActor {
  userId: string;
  email: string;
  role: string;
}

export interface StoredAuditEvent {
  id: string;
  actorId: string;
  actorEmail: string;
  actorRole: string;
  action: AuditActionType;
  entity: string;
  entityId?: string;
  beforeState: Record<string, any>;
  afterState: Record<string, any>;
  result: Record<string, any>;
  metadata: Record<string, any>;
  createdAt: string;
}

export interface CreateAuditRecordInput {
  action: AuditActionType;
  entity: string;
  entityId?: string;
  beforeState?: Record<string, any>;
  afterState?: Record<string, any>;
  result?: Record<string, any>;
  metadata?: Record<string, any>;
}

const SECRET_KEYS = [
  'api_key',
  'apikey',
  'secret',
  'hmac_secret',
  'authorization',
  'bearer',
  'password',
  'service_role'
];

export function sanitizeAuditPayload(obj: any): any {
  if (obj === null || obj === undefined) return {};
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeAuditPayload);

  const sanitized: Record<string, any> = {};

  for (const [key, value] of Object.entries(obj)) {
    const isSecret = SECRET_KEYS.some(
      sKey => key.toLowerCase().includes(sKey)
    );

    if (isSecret) {
      sanitized[key] = '[REDACTED_SECRET]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeAuditPayload(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

export function createAuditRecord(
  actor: AuditActor,
  input: CreateAuditRecordInput
): StoredAuditEvent {
  return {
    id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
    actorId: actor.userId,
    actorEmail: actor.email,
    actorRole: actor.role,
    action: input.action,
    entity: input.entity,
    entityId: input.entityId,
    beforeState: sanitizeAuditPayload(input.beforeState || {}),
    afterState: sanitizeAuditPayload(input.afterState || {}),
    result: sanitizeAuditPayload(input.result || {}),
    metadata: sanitizeAuditPayload(input.metadata || {}),
    createdAt: new Date().toISOString()
  };
}

export class InMemoryAuditStore {
  private static instance: InMemoryAuditStore;
  private logs: StoredAuditEvent[] = [];

  private constructor() {}

  public static getInstance(): InMemoryAuditStore {
    if (!InMemoryAuditStore.instance) {
      InMemoryAuditStore.instance = new InMemoryAuditStore();
    }

    return InMemoryAuditStore.instance;
  }

  public append(event: StoredAuditEvent): void {
    this.logs.push(event);
  }

  public getLogs(limit = 50): StoredAuditEvent[] {
    return [...this.logs]
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() -
          new Date(a.createdAt).getTime()
      )
      .slice(0, limit);
  }

  public clear(): void {
    this.logs = [];
  }
}
