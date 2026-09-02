import { config } from './config';

export class BrandBoxApiError extends Error {
  constructor(public status: number, public code: string) {
    super(code);
  }
}

export async function apiRequest<T>(path: string, accessToken: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${config.apiBaseUrl}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      Authorization: `Bearer ${accessToken}`,
      ...(init?.headers || {}),
    },
  });

  const payload = await response.json().catch(() => ({})) as Record<string, unknown>;
  if (!response.ok) {
    const code = typeof payload.error === 'string' ? payload.error : `HTTP_${response.status}`;
    throw new BrandBoxApiError(response.status, code);
  }
  return payload as T;
}

export function requestId(prefix: string) {
  const random = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now().toString(36)}_${random}`.slice(0, 70);
}
