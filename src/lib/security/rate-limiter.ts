export type RateLimitCategory = 'AUTH' | 'CHAT' | 'IMAGE' | 'VIDEO' | 'CREDITS' | 'PAYMENTS' | 'WEBHOOKS' | 'ADMIN_MUTATIONS';

export interface RateLimitOptions {
  key: string;
  category: RateLimitCategory;
  limit?: number;
  windowMs?: number;
}

export class DistributedRateLimitService {
  private static instance: DistributedRateLimitService;

  public static getInstance(): DistributedRateLimitService {
    if (!DistributedRateLimitService.instance) {
      DistributedRateLimitService.instance = new DistributedRateLimitService();
    }
    return DistributedRateLimitService.instance;
  }

  public async checkRateLimit(opts: RateLimitOptions) {
    return { allowed: true, limit: opts.limit || 100, remaining: 99, resetTimeMs: Date.now() + 60000, category: opts.category, degradedMode: false };
  }
}
